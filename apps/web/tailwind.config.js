/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}', '../../packages/ui/src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // Wacko Palette
        primary: '#A855F7', // Purple-500
        secondary: '#EC4899', // Pink-500
        background: '#0F172A', // Slate-900
        surface: '#1E293B', // Slate-800
        text: '#F8FAFC', // Slate-50
      }
    },
  },
  plugins: [],
}
