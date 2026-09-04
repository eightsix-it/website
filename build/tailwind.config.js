/** @type {import('tailwindcss').Config} */
module.exports = {
    // Class names appear in the pages themselves and in string literals inside
    // site.js / experience.js, so both are scanned.
    // Paths are relative to this file, which lives in build/ so that the
    // deployed site root stays free of Node tooling.
    content: ['../*.html', '../*.js'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                "primary": "#1f3a89",
                "primary-text": "#8FA8F0",
                "background-light": "#f6f6f8",
                "background-dark": "#0B1220",
                "accent-red": "#D62828",
                "accent-yellow": "#F4C430",
                "card-dark": "#151f3d",
            },
            fontFamily: {
                "display": ["Space Grotesk", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/container-queries'),
    ],
}
