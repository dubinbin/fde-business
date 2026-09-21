/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#101312', // 页面背景
          850: '#141917',
          800: '#181d1b', // 卡片
          750: '#1d2320',
          700: '#232a27', // 卡片内嵌
          600: '#2c332f', // 边框(亮)
        },
        line: {
          DEFAULT: '#232a27',
          soft: '#1c221f',
          strong: '#39423d',
        },
        cream: '#F2EFE6', // 标题米白
        body: '#B9C2BC', // 正文浅灰
        muted: '#8A948F',
        teal: {
          DEFAULT: '#3FD6B0',
          soft: '#8FE9D2',
          dim: '#1E7F69',
        },
        cat: {
          sales: '#5A9BD8',
          sourcing: '#4C8FE8',
          engineering: '#7FB2E5',
          production: '#E0A23C',
          quality: '#A98BE0',
        },
      },
      fontFamily: {
        sans: [
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Source Han Sans SC"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['"SF Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      maxWidth: {
        shell: '1200px',
      },
      keyframes: {
        fadeup: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeup: 'fadeup .45s cubic-bezier(.2,.7,.3,1) both',
      },
    },
  },
  plugins: [],
};
