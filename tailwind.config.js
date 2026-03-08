/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#388e3c',
                'primary-dark': '#2e7d32',
            }
        },
    },
    plugins: [],
}
