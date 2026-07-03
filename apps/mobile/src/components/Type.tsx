/**
 * Type.tsx — Surface-driven text primitives for Consono v6.
 *
 * Rule: "text follows the surface, not the brand."
 * Cobalt (brand) is reserved for brand-emphasis text (big numbers, key
 * action labels, active toggles) on light/tinted surfaces only.
 * On cobalt-filled or gold surfaces it falls back to the primary text color.
 *
 * Usage:
 *   <Display>Bom dia, Léo.</Display>
 *   <Display italic>O que ouves?</Display>
 *   <Num>23</Num>
 *   <Mono>today</Mono>
 *   <Body>Review your cards.</Body>
 *   <Action>Start review</Action>
 */
import { Text, TextProps, TextStyle } from 'react-native';
import { fonts, textForSurface, Surface, TextTone, useTheme } from '@/src/lib/theme';
// fonts.display === 'InstrumentSerif', fonts.displayItalic === 'InstrumentSerif_Italic'
// fonts.mono === 'GeistMono', fonts.ui === 'Geist' — resolved from theme, not inlined here

// ── Shared prop types ────────────────────────────────────────────────────────

interface TypeProps extends TextProps {
  /** Override the surface detected from context. */
  surface?: Surface;
  /** Override the default tone for this primitive. */
  tone?: TextTone;
}

/** Resolves the text color: context surface → override → tone. */
function useTextColor(
  surface?: Surface,
  tone?: TextTone,
  defaultTone: TextTone = 'primary',
): string {
  const { surface: ctxSurface } = useTheme();
  return textForSurface(surface ?? ctxSurface, tone ?? defaultTone);
}

// ── Primitives ───────────────────────────────────────────────────────────────

interface DisplayProps extends TypeProps {
  /** Use italic variant (Instrument Serif italic). */
  italic?: boolean;
  /** Font size override; defaults to 30. */
  size?: number;
}

/**
 * Display — Instrument Serif, 30 px by default.
 * Used for greeting copy ("Bom dia, Léo."), section headings, and the
 * large welcome text. Defaults to `tone="primary"`.
 */
export function Display({ italic, size = 30, surface, tone, style, ...rest }: DisplayProps) {
  const color = useTextColor(surface, tone, 'primary');
  const baseStyle: TextStyle = {
    fontFamily: italic ? fonts.displayItalic : fonts.display,
    fontSize: size,
    lineHeight: size * 1.05,
    letterSpacing: -0.01 * size,
    color,
  };
  return <Text style={[baseStyle, style]} {...rest} />;
}

interface HeadingProps extends TypeProps {
  /** Font size override; defaults to 22. */
  size?: number;
}

/**
 * Heading — Instrument Serif, 22 px.
 * Used for section-level headings inside cards and modals.
 */
export function Heading({ size = 22, surface, tone, style, ...rest }: HeadingProps) {
  const color = useTextColor(surface, tone, 'primary');
  const baseStyle: TextStyle = {
    fontFamily: fonts.display,
    fontSize: size,
    lineHeight: size * 1.1,
    color,
  };
  return <Text style={[baseStyle, style]} {...rest} />;
}

type BodyWeight = 'regular' | 'medium' | 'semibold' | 'bold';

interface BodyProps extends TypeProps {
  /** Font weight variant; defaults to 'regular'. */
  weight?: BodyWeight;
  /** Font size override; defaults to 15. */
  size?: number;
}

const bodyFamilyMap: Record<BodyWeight, string> = {
  regular: fonts.ui,
  medium: fonts.uiMedium,
  semibold: fonts.uiSemibold,
  bold: fonts.uiBold,
};

/**
 * Body — Geist, 15 px, regular weight by default.
 * Primary body copy for sentences, descriptions, and list items.
 */
export function Body({ weight = 'regular', size = 15, surface, tone, style, ...rest }: BodyProps) {
  const color = useTextColor(surface, tone, 'primary');
  const baseStyle: TextStyle = {
    fontFamily: bodyFamilyMap[weight],
    fontSize: size,
    lineHeight: size * 1.5,
    color,
  };
  return <Text style={[baseStyle, style]} {...rest} />;
}

interface MonoProps extends TypeProps {
  /** Font size override; defaults to 10. */
  size?: number;
}

/**
 * Mono — Geist Mono, 10 px, uppercase with 0.12em letter spacing.
 * Used for eyebrow labels, stat labels, axis ticks.
 * Defaults to `tone="muted"` (matches design spec for label color).
 */
export function Mono({ size = 10, surface, tone, style, ...rest }: MonoProps) {
  const color = useTextColor(surface, tone, 'muted');
  const baseStyle: TextStyle = {
    fontFamily: fonts.monoMedium,
    fontSize: size,
    letterSpacing: 0.12 * size,
    textTransform: 'uppercase',
    color,
  };
  return <Text style={[baseStyle, style]} {...rest} />;
}

interface NumProps extends TypeProps {
  /** Font size override; defaults to 64. */
  size?: number;
}

/**
 * Num — Instrument Serif, 64 px, brand emphasis by default.
 * The big numbers on stat tiles (due count, streak count, etc.).
 * `tone="brand"` resolves to cobalt on light/oled, primary on cobalt/gold.
 */
export function Num({ size = 64, surface, tone, style, ...rest }: NumProps) {
  const color = useTextColor(surface, tone, 'brand');
  const baseStyle: TextStyle = {
    fontFamily: fonts.display,
    fontSize: size,
    lineHeight: size * 0.95,
    letterSpacing: -0.02 * size,
    color,
  };
  return <Text style={[baseStyle, style]} {...rest} />;
}

interface ActionProps extends TypeProps {
  /** Font size override; defaults to 14. */
  size?: number;
}

/**
 * Action — Geist SemiBold, 14 px, brand emphasis by default on light.
 * Used for key action labels ("Start review", "Save", active toggles).
 * `tone="brand"` resolves to cobalt on light/oled, primary on cobalt/gold.
 */
export function Action({ size = 14, surface, tone, style, ...rest }: ActionProps) {
  const color = useTextColor(surface, tone, 'brand');
  const baseStyle: TextStyle = {
    fontFamily: fonts.uiSemibold,
    fontSize: size,
    color,
  };
  return <Text style={[baseStyle, style]} {...rest} />;
}
