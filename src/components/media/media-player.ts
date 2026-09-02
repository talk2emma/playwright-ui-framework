import { BaseComponent } from '../../core/base.component';
import { waitUntil } from '../../utils/retry.utils';
import { TIMEOUTS } from '../../config/timeouts';

/**
 * `<video>` and `<audio>`.
 *
 * Drives the media element through its DOM API rather than clicking custom
 * player chrome, so the same component works for any skin.
 */
export class MediaPlayer extends BaseComponent {
  protected override get componentType(): string {
    return 'MediaPlayer';
  }

  async play(): Promise<void> {
    await this.step('play', async () => {
      await this.locator.evaluate(async (element) => {
        if (element instanceof HTMLMediaElement) await element.play();
      });
    });
  }

  async pause(): Promise<void> {
    await this.step('pause', async () => {
      await this.locator.evaluate((element) => {
        if (element instanceof HTMLMediaElement) element.pause();
      });
    });
  }

  async isPlaying(): Promise<boolean> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLMediaElement ? !element.paused && !element.ended : false,
    );
  }

  async getCurrentTime(): Promise<number> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLMediaElement ? element.currentTime : 0,
    );
  }

  async getDuration(): Promise<number> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLMediaElement ? element.duration : 0,
    );
  }

  async seekTo(seconds: number): Promise<void> {
    await this.step(`seek to ${seconds}s`, async () => {
      await this.locator.evaluate((element, time) => {
        if (element instanceof HTMLMediaElement) element.currentTime = time;
      }, seconds);
    });
  }

  async setVolume(level: number): Promise<void> {
    await this.step(`set volume ${level}`, async () => {
      await this.locator.evaluate(
        (element, value) => {
          if (element instanceof HTMLMediaElement) element.volume = value;
        },
        Math.min(Math.max(level, 0), 1),
      );
    });
  }

  async getVolume(): Promise<number> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLMediaElement ? element.volume : 0,
    );
  }

  async mute(): Promise<void> {
    await this.setMuted(true);
  }

  async unmute(): Promise<void> {
    await this.setMuted(false);
  }

  async isMuted(): Promise<boolean> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLMediaElement ? element.muted : false,
    );
  }

  async setPlaybackRate(rate: number): Promise<void> {
    await this.step(`set playback rate ${rate}x`, async () => {
      await this.locator.evaluate((element, value) => {
        if (element instanceof HTMLMediaElement) element.playbackRate = value;
      }, rate);
    });
  }

  /** readyState >= 3 means enough data is buffered to play through. */
  async waitForReady(timeout = TIMEOUTS.LONG): Promise<void> {
    await waitUntil(
      async () =>
        this.locator.evaluate((element) =>
          element instanceof HTMLMediaElement ? element.readyState >= 3 : false,
        ),
      { timeout, message: `${this.label} never became ready to play` },
    );
  }

  async waitForPlaybackProgress(seconds: number, timeout = TIMEOUTS.LONG): Promise<void> {
    const start = await this.getCurrentTime();
    await waitUntil(async () => (await this.getCurrentTime()) >= start + seconds, {
      timeout,
      message: `${this.label} did not advance ${seconds}s`,
    });
  }

  async hasEnded(): Promise<boolean> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLMediaElement ? element.ended : false,
    );
  }

  async getSource(): Promise<string> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLMediaElement ? element.currentSrc : '',
    );
  }

  /** Captions/subtitles tracks — required for accessible video. */
  async getTextTracks(): Promise<Array<{ kind: string; label: string; language: string }>> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLMediaElement
        ? Array.from(element.textTracks).map((track) => ({
            kind: track.kind,
            label: track.label,
            language: track.language,
          }))
        : [],
    );
  }

  private async setMuted(muted: boolean): Promise<void> {
    await this.step(muted ? 'mute' : 'unmute', async () => {
      await this.locator.evaluate((element, value) => {
        if (element instanceof HTMLMediaElement) element.muted = value;
      }, muted);
    });
  }
}
