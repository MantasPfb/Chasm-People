/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#EDF2F9',
        surface: '#FFFFFF',
        border: {
          DEFAULT: '#D4DEEC',
          strong: '#C3D0E4',
        },
        ink: {
          DEFAULT: '#0F1E33',
          muted: '#3E5170',
          faint: '#7587A2',
        },
        accent: {
          DEFAULT: '#406FB6',
          dark: '#2F5690',
          light: '#E3ECF9',
        },
        side: {
          DEFAULT: '#0A1629',
          light: '#15305A',
          ink: '#C6D5EC',
          'ink-muted': '#7D94B9',
        },
        amber: {
          DEFAULT: '#A2660C',
          light: '#FCF0DA',
        },
        good: {
          DEFAULT: '#23764C',
          light: '#E1F2E8',
        },
        critical: {
          DEFAULT: '#B7302F',
          light: '#FBE7E7',
        },
        brightblue: {
          DEFAULT: '#1570EF',
          light: '#E0F0FF',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Nunito', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        overlay: '0 12px 32px rgba(27, 29, 30, 0.12)',
      },
    },
  },
  plugins: [],
}
