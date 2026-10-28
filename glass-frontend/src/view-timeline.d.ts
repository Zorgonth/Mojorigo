// Experimental browser API used by the existing glass refraction effect.
declare class ViewTimeline extends AnimationTimeline {
  constructor(options: { axis?: 'block' | 'inline' | 'x' | 'y'; subject?: Element });
  readonly source: Element | null;
  readonly startOffset: CSSNumericValue;
  readonly endOffset: CSSNumericValue;
}
