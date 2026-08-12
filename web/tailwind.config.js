/**
 * Los tokens viven en `globals.css` como color completo (hex o rgba), no como
 * canales sueltos, para que el modo oscuro pueda usar rgba con alfa propio
 * (glassmorphism). Tailwind 3 no sabe aplicar un modificador de opacidad a un
 * `var(--x)` opaco: no lo puede parsear como color y descarta la utilidad
 * entera, así que `bg-accent/12` no generaba NADA de CSS. Envolver el token en
 * `color-mix` con `<alpha-value>` devuelve el soporte de `/opacidad` sin tocar
 * los tokens.
 */
const token = (name) =>
  `color-mix(in srgb, var(--${name}) calc(<alpha-value> * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        'background-subtle': token('background-subtle'),
        'background-panel': token('background-panel'),
        'background-hover': token('background-hover'),
        foreground: token('foreground'),
        'foreground-2': token('foreground-2'),
        'foreground-3': token('foreground-3'),
        'foreground-4': token('foreground-4'),
        card: token('card'),
        'card-foreground': token('card-foreground'),
        muted: token('muted'),
        'muted-foreground': token('muted-foreground'),
        border: token('border'),
        'border-strong': token('border-strong'),
        input: token('input'),
        primary: token('primary'),
        'primary-hover': token('primary-hover'),
        'primary-soft': token('primary-soft'),
        'primary-tint': token('primary-tint'),
        'primary-text': token('primary-text'),
        'primary-foreground': token('primary-foreground'),
        accent: token('accent'),
        'accent-hover': token('accent-hover'),
        'accent-soft': token('accent-soft'),
        'accent-tint': token('accent-tint'),
        'accent-text': token('accent-text'),
        'accent-foreground': token('accent-foreground'),
        cyan: token('cyan'),
        destructive: token('destructive'),
        'destructive-foreground': token('destructive-foreground'),
        success: token('success'),
        warning: token('warning'),
        ring: token('ring'),
        'bubble-out': token('bubble-out'),
        'bubble-out-text': token('bubble-out-text'),
        'bubble-in': token('bubble-in'),
        'sidebar-bg': token('sidebar-bg'),
        'sidebar-text': token('sidebar-text'),
        'sidebar-text-active': token('sidebar-text-active'),
      },
      /* Tintes sutiles que la UI ya usaba (accent/8, destructive/12, …) pero que
         no existen en la escala por defecto, así que no generaban utilidad. */
      opacity: {
        2: '0.02',
        6: '0.06',
        8: '0.08',
        12: '0.12',
        15: '0.15',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'pop': 'var(--shadow-pop)',
        'button': 'var(--shadow-button)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(2px)' }, to: { opacity: '1', transform: 'none' } },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
