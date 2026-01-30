const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      height: {
        "screen-1/2": "50vh",
        "screen-1/5": "20vh",
        "screen-2/5": "40vh",
        "screen-3/5": "60vh",
        "screen-4/5": "80vh",
        "screen-5/5": "100vh",
      },

      colors: {
        // OneZap Brand Colors - Apple-like Dark + Blue
        primaryColor: "#0A84FF",        // Azul Apple (antigo: #2AB09C)
        secondColor: "#1C1C1E",         // Cinza escuro
        selectedColor: "#0066CC",       // Azul escuro selecionado
        backgroundColor: "#000000",     // Preto puro

        // Dashboard Theme - Dark Mode
        dashboardBg: "#000000",         // Preto puro (antigo: #1a202c)
        dashboardCard: "#1C1C1E",       // Cinza escuro (antigo: #2d3748)
        dashboardAccent: "#0A84FF",     // Azul Apple (antigo: #38d9a9)
        dashboardPrimary: "#0A84FF",    // Azul Apple (antigo: #2AB09C)

        // Menu Theme
        menuBg: "#000000",
        menuBorder: "#38383A",
        menuItem: "#1C1C1E",
        menuGradientStart: "#1C1C1E",
        menuGradientEnd: "#000000",
        menuHoverStart: "#2C2C2E",
        menuHoverEnd: "#1C1C1E",

        // Access/Auth
        accessValidText: "#30D158",     // Verde Apple
        accessBg: "#000000",

        // Navbar
        navbarBg: "#000000",
        inactiveBtnBg: "#1C1C1E",
        inactiveBtnHover: "#2C2C2E",

        // Instance Buttons
        instanceBtnBg: "#0A84FF20",     // Azul com transparência
        instanceBtnText: "#0A84FF",
        instanceBtnHover: "#0A84FF30",
        instanceBtnBorder: "#0A84FF",
        instanceBtnIndicator: "#0A84FF",

        // Chat Theme
        chatSidebarBg: "#000000",
        chatHeaderBg: "#1C1C1E",
        chatContentBg: "#000000",
        chatItemHover: "#2C2C2E",
        chatItemSelected: "#0A84FF20",
        chatMessageFromMeBg: "#0A84FF",
        chatMessageFromMeHover: "#409CFF",
        chatMessageFromOtherBg: "#2C2C2E",
        chatInputBg: "#1C1C1E",
        chatWelcomeBg: "#1C1C1E",

        // Login Gradient
        loginGradientFrom: "#000000",
        loginGradientVia: "#0A84FF10",
        loginGradientTo: "#000000",

        // Navigation Buttons
        navButtonActive: "#0A84FF",
        navButtonIndicator: "#0A84FF",
        navButtonHover: "#409CFF",
        logButtonIcon: "#0A84FF",
        navText: "#0A84FF",
        navTextStrong: "#0A84FF",
        navIndicator: "#0A84FF",
        navTextHover: "#409CFF",
        navTextMuted: "#8E8E93",

        // Action Buttons
        actionButton: "#0A84FF",
        actionButtonHover: "#409CFF",
        actionButtonText: "#ffffff",

        // Semantic Colors (Apple-like)
        onezapSuccess: "#30D158",
        onezapWarning: "#FF9F0A",
        onezapError: "#FF453A",
        onezapInfo: "#0A84FF",

        // Shadcn/Radix UI Variables
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
        'gradient-flowing': 'linear-gradient(to right, #2AB09C, #38d9a9, #2AB09C)',
        'login-gradient': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
        'nav-button-gradient': 'linear-gradient(to right, var(--tw-gradient-stops))',
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-subtle": {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-subtle": "pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      boxShadow: {
        'glow': '0 0 15px rgba(42, 176, 156, 0.5)',
      },
      transitionProperty: {
        'background-position': 'background-position',
      },
      transitionDuration: {
        '2000': '2000ms',
      },
      backgroundSize: {
        '200%': '200% 100%',
      },
      backgroundPosition: {
        'pos-0': '0% center',
        'pos-100': '100% center',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addBase, theme }) {
      addBase({
        'button': {
          cursor: 'pointer !important',
          'pointer-events': 'auto !important',
          position: 'relative',
        },
        'button:disabled': {
          cursor: 'not-allowed !important',
        }
      })
    }
  ],
  corePlugins: {
    preflight: false,
  },
  darkMode: "class",
};
