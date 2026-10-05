import Phaser from 'phaser';
import { gameConfigFor } from '../data';
import { playableCollection, type CollectionDef } from '../data/collections';
import { formatNumber, t } from '../data/i18n';
import { clearCells, placeShape } from '../game/board';
import { BOARD_SIZE, TRAY_SIZE } from '../game/constants';
import { createDailyGame } from '../game/daily';
import { placeableSlots } from '../game/gameOver';
import {
  applyMove,
  createGame,
  getPattern,
  previewMove,
  type GameConfig,
  type GameMode,
  type GameState,
  type MoveResult,
} from '../game/state';
import { app, feedback } from '../services';
import { withDaily, withRunRecorded, withWeave } from '../storage/save';
import { BoardView } from '../ui/BoardView';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { animate, ms, reducedMotion } from '../ui/motion';
import { PatternPreview } from '../ui/PatternPreview';
import { PieceSprite } from '../ui/PieceSprite';
import { fitText, textStyle } from '../ui/text';
import { TrayView } from '../ui/TrayView';
import { goTo } from '../ui/transitions';
import { localDateKey, shortDateLabel } from '../utils/date';
import { randomSeed } from '../utils/rng';
import { BaseScene } from './BaseScene';
import type { ResultData } from './ResultScene';

export interface GameSceneData {
  mode?: GameMode;
}

interface DragState {
  slot: number;
  pointerId: number;
  /** How far above the finger the piece floats (touch only). */
  lift: number;
  row: number;
  col: number;
  valid: boolean;
}

export class GameScene extends BaseScene {
  private mode: GameMode = 'classic';
  private collection!: CollectionDef;
  private config!: GameConfig;
  private state!: GameState;
  private best = 0;
  private shownScore = 0;
  private recorded = false;

  private board!: BoardView;
  private tray!: TrayView;
  private dragSprite!: PieceSprite;
  private drag: DragState | null = null;
  private returningSlot: number | null = null;
  private busy = false;
  private modal: Modal | null = null;

  private pauseBtn!: IconButton;
  private scoreLabel!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private bestLabel!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private modeTitle!: Phaser.GameObjects.Text;

  private objPreview!: PatternPreview;
  private objLabel!: Phaser.GameObjects.Text;
  private objName!: Phaser.GameObjects.Text;
  private objHint!: Phaser.GameObjects.Text;
  private objBox = { x: 0, y: 0, size: 0, w: 0 };

  private banner!: Phaser.GameObjects.Container;
  private bannerBg!: Phaser.GameObjects.Graphics;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerSub!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private popups: Phaser.GameObjects.Text[] = [];
  private popupIndex = 0;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    this.mode = data?.mode ?? 'classic';
    this.drag = null;
    this.returningSlot = null;
    this.busy = false;
    this.modal = null;
    this.recorded = false;
    this.popups = [];
  }

  protected build(): void {
    const { th } = this;
    const save = app().save.data;
    this.collection = playableCollection(save.activeCollection);
    this.config = gameConfigFor(this.collection, save.unlockedPatterns);
    const dailyKey = localDateKey();
    this.state =
      this.mode === 'daily'
        ? createDailyGame(this.config, dailyKey)
        : createGame(this.config, { mode: this.mode, seed: randomSeed() });
    this.best = this.mode === 'daily' ? (save.daily[dailyKey]?.bestScore ?? 0) : save.bestScore;
    this.shownScore = 0;

    const pace = this.mode === 'slow' ? 1.6 : 1;
    this.board = new BoardView(this, BOARD_SIZE, this.collection.id, th, pace);
    this.tray = new TrayView(this, TRAY_SIZE, this.collection.id, th.hc, (slot, p) => this.startDrag(slot, p));
    this.dragSprite = new PieceSprite(this, this.collection.id, th.hc).setDepth(50).setVisible(false);

    // Top bar
    this.pauseBtn = new IconButton(this, 'pause', th, () => this.openPause());
    const scoreLabelText = this.mode === 'daily' ? `${t('today')} · ${shortDateLabel(dailyKey).toUpperCase()}` : t('score');
    this.scoreLabel = this.add.text(0, 0, scoreLabelText, textStyle('label', 11, th.textMuted)).setOrigin(0.5);
    this.scoreText = this.add.text(0, 0, '0', textStyle('number', 34, th.text)).setOrigin(0.5);
    this.bestLabel = this.add.text(0, 0, t('best'), textStyle('label', 11, th.textMuted)).setOrigin(1, 0.5);
    this.bestText = this.add.text(0, 0, formatNumber(this.best), textStyle('number', 18, th.textMuted)).setOrigin(1, 0.5);
    this.modeTitle = this.add
      .text(0, 0, t('slowWeaveTitle'), textStyle('title', 22, th.text, { fontStyle: 'italic 400' }))
      .setOrigin(0.5);
    const slow = this.mode === 'slow';
    for (const o of [this.scoreLabel, this.scoreText, this.bestLabel, this.bestText]) o.setVisible(!slow);
    this.modeTitle.setVisible(slow);

    // Objective
    this.objPreview = new PatternPreview(this, th);
    this.objLabel = this.add.text(0, 0, '', textStyle('label', 11, th.textMuted)).setOrigin(0, 0.5);
    this.objName = this.add.text(0, 0, '', textStyle('title', 19, th.text)).setOrigin(0, 0.5);
    this.objHint = this.add.text(0, 0, '', textStyle('body', 12, th.textMuted)).setOrigin(0, 0.5);

    // Feedback text
    this.bannerBg = this.add.graphics();
    this.bannerText = this.add.text(0, 0, t('weaveComplete'), textStyle('display', 26, th.text)).setOrigin(0.5);
    this.bannerSub = this.add.text(0, 0, t('dailyComplete'), textStyle('body', 13, th.textMuted)).setOrigin(0.5);
    this.banner = this.add.container(0, 0, [this.bannerBg, this.bannerText, this.bannerSub]).setDepth(60).setVisible(false);
    this.toastText = this.add
      .text(0, 0, '', textStyle('title', 16, th.textMuted, { fontStyle: 'italic 400' }))
      .setOrigin(0.5)
      .setAlpha(0);
    for (let i = 0; i < 3; i++) {
      this.popups.push(this.add.text(0, 0, '', textStyle('number', 26, th.accentCss)).setOrigin(0.5).setDepth(55).setVisible(false));
    }

    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);

    app().audio.startAmbient(slow ? 'slow' : 'calm');
    this.refreshObjective();
  }

  protected enter(): void {
    this.tray.setPlaceable(placeableSlots(this.state.board, this.state.tray));
    this.tray.setPieces(this.state.tray, true);
    if (this.mode === 'slow') this.showToast(t('slowWeaveHint'), 2600);
    else if (app().save.data.lifetime.games === 0) this.showToast(t('dragHint'), 4000);
  }

  protected layout(): void {
    const { f } = this;
    const { u } = f;
    this.cancelDrag();

    // Top bar
    const barY = f.top + u(40);
    this.pauseBtn.place(f.colX + u(32), barY, u(48));
    this.scoreLabel.setFontSize(f.font(11)).setLetterSpacing(u(1.8)).setPosition(f.cx, barY - u(16));
    this.scoreText.setFontSize(f.font(34)).setPosition(f.cx, barY + u(10));
    const right = f.colX + f.colW - u(24);
    this.bestLabel.setFontSize(f.font(11)).setLetterSpacing(u(1.8)).setPosition(right, barY - u(16));
    this.bestText.setFontSize(f.font(18)).setPosition(right, barY + u(8));
    this.modeTitle.setFontSize(f.font(22)).setPosition(f.cx, barY);

    // Objective strip, board, tray: centred together in the remaining height
    const objH = u(64);
    const trayH = u(150);
    const gapA = u(16);
    const gapB = u(26);
    const top = barY + u(36);
    const bottom = f.bottom - u(8);
    const side = Math.max(u(200), Math.min(f.colW - u(32), bottom - top - objH - gapA - gapB - trayH));
    const block = objH + gapA + side + gapB + trayH;
    const y0 = top + Math.max(0, (bottom - top - block) / 2);
    const boardX = f.cx - side / 2;
    const boardY = y0 + objH + gapA;

    this.objBox = { x: boardX, y: y0, size: objH, w: side };
    this.layoutObjective();
    this.board.layout(boardX, boardY, side);
    this.board.render(this.state.board);
    this.tray.layout(f.colX + u(8), boardY + side + gapB, f.colW - u(16), trayH, this.board.pitch);

    this.toastText.setFontSize(f.font(16)).setPosition(f.cx, boardY + side + gapB * 0.62);
    this.layoutBanner(boardY + side / 2);
    for (const p of this.popups) p.setFontSize(f.font(26));
    this.modal?.layout(f);
  }

  protected teardown(): void {
    this.input.off('pointermove', this.onPointerMove, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.input.off('pointerupoutside', this.onPointerUp, this);
  }

  // Objective ---------------------------------------------------------------

  private refreshObjective(): void {
    const pattern = getPattern(this.config, this.state.objectiveId);
    const visible = Boolean(pattern);
    for (const o of [this.objPreview, this.objLabel, this.objName, this.objHint]) o.setVisible(visible);
    if (!pattern) return;
    const isDaily = this.state.daily && !this.state.daily.completed && pattern.id === this.state.daily.objectiveId;
    this.objLabel.setText(isDaily ? t('todaysMotif') : t('motif'));
    this.objName.setText(pattern.name);
    const hasResist = pattern.def.grid.some((row) => row.includes('o'));
    const where = pattern.def.rotations ? t('weaveHintTurn') : t('weaveHint');
    this.objHint.setText(hasResist ? `${where} · ${t('resistHint')}` : where);
    this.layoutObjective();
  }

  private layoutObjective(): void {
    const { f } = this;
    const { u } = f;
    const { x, y, size, w } = this.objBox;
    const pattern = getPattern(this.config, this.state.objectiveId);
    let previewW = size;
    if (pattern) {
      const box = size - u(6);
      const pitch = PatternPreview.pitchFor(pattern.def, box, box * 1.8);
      previewW = Math.max(box, pitch * pattern.def.grid[0].length);
      this.objPreview.setPosition(x + previewW / 2, y + size / 2).draw(pattern.def, pitch, {
        collectionId: this.collection.id,
        motifCount: this.collection.motifs.length,
      });
    }
    const tx = x + previewW + u(14);
    this.objLabel.setFontSize(f.font(11)).setLetterSpacing(u(1.6)).setPosition(tx, y + size * 0.2);
    const room = x + w - tx;
    this.objName.setPosition(tx, y + size * 0.5);
    fitText(this.objName, f.font(19), room);
    this.objHint.setPosition(tx, y + size * 0.82);
    fitText(this.objHint, f.font(12), room, f.font(10));
  }

  // Dragging ----------------------------------------------------------------

  private startDrag(slot: number, pointer: Phaser.Input.Pointer): void {
    if (this.busy || this.modal || this.drag || this.state.over) return;
    const piece = this.state.tray[slot];
    if (!piece) return;
    if (this.returningSlot !== null) {
      this.tweens.killTweensOf(this.dragSprite);
      this.tray.show(this.returningSlot);
      this.returningSlot = null;
    }
    const { pitch } = this.board;
    const lift = pointer.wasTouch ? (piece.shape.height * pitch) / 2 + pitch * 0.9 : 0;
    this.drag = { slot, pointerId: pointer.id, lift, row: -99, col: -99, valid: false };
    this.tray.hide(slot);
    const from = this.tray.slotCenter(slot);
    this.dragSprite
      .show(piece, pitch)
      .setPosition(from.x, from.y)
      .setScale(this.tray.pitch / pitch)
      .setAlpha(1)
      .setVisible(true);
    animate(this, { targets: this.dragSprite, scale: 1, duration: 90, ease: 'Sine.Out' });
    feedback('piece_pickup');
    this.updateDrag(pointer);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.drag && pointer.id === this.drag.pointerId) this.updateDrag(pointer);
  }

  private updateDrag(pointer: Phaser.Input.Pointer): void {
    const d = this.drag;
    const piece = d ? this.state.tray[d.slot] : null;
    if (!d || !piece) return;
    const x = pointer.x;
    const y = pointer.y - d.lift;
    this.dragSprite.setPosition(x, y);
    const { pitch } = this.board;
    const { row, col } = this.board.snap(x - (piece.shape.width * pitch) / 2, y - (piece.shape.height * pitch) / 2);
    if (row === d.row && col === d.col) return;
    d.row = row;
    d.col = col;
    const preview = previewMove(this.config, this.state, d.slot, row, col);
    d.valid = preview !== null;
    if (preview) {
      const clearing = preview.pattern ? [...preview.lineCells, ...preview.pattern.cells] : preview.lineCells;
      this.board.showPreview(preview.placed, piece.motif, clearing);
    } else {
      this.board.clearPreview();
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d || pointer.id !== d.pointerId) return;
    this.drag = null;
    this.board.clearPreview();
    if (d.valid) this.commit(d.slot, d.row, d.col);
    else this.returnPiece(d.slot, d.row > -50);
  }

  private returnPiece(slot: number, overBoard: boolean): void {
    if (overBoard) feedback('invalid');
    const home = this.tray.slotCenter(slot);
    this.returningSlot = slot;
    animate(this, {
      targets: this.dragSprite,
      x: home.x,
      y: home.y,
      scale: this.tray.pitch / this.board.pitch,
      duration: 170,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.dragSprite.setVisible(false);
        this.tray.show(slot);
        this.returningSlot = null;
      },
    });
  }

  private cancelDrag(): void {
    if (!this.drag) return;
    const { slot } = this.drag;
    this.drag = null;
    this.board.clearPreview();
    this.dragSprite.setVisible(false);
    this.tray.show(slot);
  }

  // Resolving a move ----------------------------------------------------------

  private commit(slot: number, row: number, col: number): void {
    const prev = this.state;
    const out = applyMove(this.config, prev, slot, row, col);
    if (!out) {
      this.returnPiece(slot, true);
      return;
    }
    const { result } = out;
    this.state = out.state;
    this.busy = true;
    this.dragSprite.setVisible(false);
    this.tray.clear(slot);
    this.tray.show(slot);

    const placedBoard = placeShape(prev.board, result.piece.shape, row, col, result.piece.motif);
    this.board.render(placedBoard);
    this.board.animatePlace(result.placed);
    feedback('piece_place', 'place');
    this.toastText.setAlpha(0);

    if (result.pattern) this.recordWeave(result.pattern.patternId);
    if (result.dailyCompleted && this.state.daily) {
      const key = this.state.daily.key;
      app().save.update((s) => withDaily(s, key, { completed: true }));
    }

    const afterClear = () => {
      if (result.cleared.length) this.board.render(clearCells(placedBoard, result.cleared));
      if (result.loosened.length) {
        this.showToast(t('loosen'), 2000);
        this.board.animateLoosen(result.loosened, () => {
          this.board.render(this.state.board);
          this.settle(result);
        });
      } else {
        this.settle(result);
      }
    };

    if (result.cleared.length === 0) {
      afterClear();
      return;
    }
    const lines = result.rows.length + result.cols.length;
    if (result.pattern) {
      feedback('pattern_complete', 'pattern');
      this.showBanner(result.dailyCompleted);
    } else {
      feedback('line_clear', 'clear', lines);
    }
    if (result.streak >= 2 && this.mode !== 'slow') {
      this.time.delayedCall(140, () => feedback('combo', undefined, result.streak));
      this.showToast(t('combo', { n: result.streak }), 1200);
    }
    if (result.score.total > 0) this.popup(`+${formatNumber(result.score.total)}`, result.cleared);
    this.updateScore();
    this.board.animateClear(result, afterClear);
  }

  private settle(result: MoveResult): void {
    if (result.pattern) this.refreshObjective();
    this.tray.setPlaceable(placeableSlots(this.state.board, this.state.tray));
    if (result.refilled) this.tray.setPieces(this.state.tray, true);
    if (result.gameOver) {
      this.endGame();
      return;
    }
    this.busy = false;
  }

  private recordWeave(patternId: string): void {
    app().save.update((s) => withWeave(s, this.collection.id, patternId));
  }

  /** Fold this run into the save once. Returns the best score for the mode. */
  private recordRun(): { best: number; isNewBest: boolean } {
    if (this.recorded) return { best: this.best, isNewBest: false };
    this.recorded = true;
    const s = this.state;
    let out = { best: this.best, isNewBest: false };
    app().save.update((save) => {
      const r = withRunRecorded(save, {
        mode: s.mode,
        score: s.score,
        lines: s.stats.lines,
        dailyKey: s.daily?.key,
        dailyCompleted: s.daily?.completed,
      });
      out = { best: r.best, isNewBest: r.isNewBest };
      return r.save;
    });
    return out;
  }

  private endGame(): void {
    this.busy = true;
    feedback('game_over', 'gameOver');
    this.showToast(t('noSpace'), 3000);
    const { best, isNewBest } = this.recordRun();
    const s = this.state;
    const data: ResultData = {
      mode: s.mode,
      score: s.score,
      best,
      isNewBest,
      stats: s.stats,
      cells: s.board.cells.slice(),
      collectionId: this.collection.id,
      daily: s.daily,
    };
    this.time.delayedCall(reducedMotion() ? 900 : 1700, () => goTo(this, 'Result', data));
  }

  // Pause ---------------------------------------------------------------------

  private openPause(): void {
    if (this.modal || this.state.over) return;
    this.cancelDrag();
    const leave = (then: () => void) => {
      if (this.state.stats.placements > 0) this.recordRun();
      then();
    };
    this.modal = new Modal(this, this.th, this.mode === 'slow' ? t('slowWeaveTitle') : t('paused'), null, [
      { label: t('resume'), variant: 'primary', onClick: () => this.closeModal() },
      { label: t('restart'), variant: 'secondary', onClick: () => leave(() => this.scene.restart({ mode: this.mode })) },
      { label: t('home'), variant: 'secondary', onClick: () => leave(() => goTo(this, 'Home')) },
    ]);
    this.modal.layout(this.f);
  }

  private closeModal(): void {
    this.modal?.close();
    this.modal = null;
  }

  // Feedback ------------------------------------------------------------------

  private updateScore(): void {
    if (this.mode === 'slow') return;
    const target = this.state.score;
    const from = this.shownScore;
    this.shownScore = target;
    if (target > this.best) {
      this.best = target;
      this.bestText.setText(formatNumber(target));
    }
    if (reducedMotion()) {
      this.scoreText.setText(formatNumber(target));
      return;
    }
    this.tweens.addCounter({
      from,
      to: target,
      duration: 450,
      ease: 'Cubic.Out',
      onUpdate: (tw) => this.scoreText.setText(formatNumber(Math.round(tw.getValue() ?? target))),
    });
  }

  private popup(text: string, cells: readonly number[]): void {
    const label = this.popups[this.popupIndex++ % this.popups.length];
    let x = 0;
    let y = 0;
    for (const i of cells) {
      const c = this.board.cellCenter(i);
      x += c.x;
      y += c.y;
    }
    x /= cells.length;
    y /= cells.length;
    this.tweens.killTweensOf(label);
    label.setText(text).setPosition(x, y).setAlpha(1).setVisible(true);
    if (reducedMotion()) {
      this.time.delayedCall(1000, () => label.setVisible(false));
      return;
    }
    this.tweens.add({
      targets: label,
      y: y - this.f.u(36),
      alpha: 0,
      delay: 250,
      duration: 900,
      ease: 'Sine.Out',
      onComplete: () => label.setVisible(false),
    });
  }

  private showToast(text: string, hold = 1400): void {
    const toast = this.toastText;
    this.tweens.killTweensOf(toast);
    toast.setText(text).setAlpha(0);
    this.tweens.add({ targets: toast, alpha: 1, duration: ms(220) || 1 });
    this.tweens.add({ targets: toast, alpha: 0, delay: hold, duration: ms(400) || 1 });
  }

  private layoutBanner(cy: number): void {
    const { f } = this;
    const { u } = f;
    this.bannerText.setFontSize(f.font(26)).setLetterSpacing(u(3));
    this.bannerSub.setFontSize(f.font(13));
    const w = Math.max(this.bannerText.width, this.bannerSub.width) + u(48);
    const h = u(this.bannerSub.visible ? 82 : 60);
    this.bannerBg.clear();
    this.bannerBg.fillStyle(this.th.bg, 0.95);
    this.bannerBg.fillRoundedRect(-w / 2, -h / 2, w, h, u(14));
    this.bannerBg.lineStyle(Math.max(1, u(1)), this.th.line, this.th.hc ? 0.9 : 0.15);
    this.bannerBg.strokeRoundedRect(-w / 2, -h / 2, w, h, u(14));
    this.bannerText.setPosition(0, this.bannerSub.visible ? -u(10) : 0);
    this.bannerSub.setPosition(0, u(20));
    this.banner.setPosition(f.cx, cy);
  }

  private showBanner(withDaily: boolean): void {
    const { banner } = this;
    this.bannerSub.setVisible(withDaily);
    this.layoutBanner(this.banner.y);
    this.tweens.killTweensOf(banner);
    const hold = withDaily ? 2200 : 1500;
    if (reducedMotion()) {
      banner.setVisible(true).setAlpha(1).setScale(1);
      this.time.delayedCall(hold, () => banner.setVisible(false));
      return;
    }
    banner.setVisible(true).setAlpha(0).setScale(0.94);
    // Let the threads weave first, then name it
    const appear = 760 * (this.mode === 'slow' ? 1.6 : 1);
    this.tweens.add({ targets: banner, alpha: 1, scale: 1, delay: appear, duration: 320, ease: 'Back.Out' });
    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: appear + hold,
      duration: 380,
      onComplete: () => banner.setVisible(false),
    });
  }
}
