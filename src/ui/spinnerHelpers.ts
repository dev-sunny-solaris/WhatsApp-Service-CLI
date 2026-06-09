export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export function getSpinnerFrame(frames: string[], tick: number): string {
  return frames[tick % frames.length]
}
