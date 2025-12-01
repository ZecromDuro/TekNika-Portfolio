/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#000000',
                primary: '#0d47ff',
                surface: '#111111',
            },
            fontFamily: {
                mono: ['monospace'], // Tu pourras changer ça plus tard
            }
        },
    },
    plugins: [],
}