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
        primaryColor: "#2AB09C",
        secondColor: "#f3eada",
        selectedColor: "#2f4858",
        backgroundColor: "#F2F2F2",
        dashboardBg: "#1a202c",
        dashboardCard: "#2d3748",
        dashboardAccent: "#38d9a9",
        dashboardPrimary: "#2AB09C",
        menuBg: "#0f172a",
        menuBorder: "#1e293b",
        menuItem: "#1e293b",
        menuGradientStart: "#1e293b",
        menuGradientEnd: "#111827",
        menuHoverStart: "#2f4466",
        menuHoverEnd: "#1e293b",
        accessValidText: "#4ade80",
        accessBg: "#111827",
        navbarBg: "#0c1524",
        inactiveBtnBg: "#152238",
        inactiveBtnHover: "#182642",
        instanceBtnBg: "#1a3a59",
        instanceBtnText: "#9ed8ec",
        instanceBtnHover: "#1f4c75",
        instanceBtnBorder: "#2a6ca8",
        instanceBtnIndicator: "#4db4d7",
        chatSidebarBg: "#0f172a",
        chatHeaderBg: "#1a2234",
        chatContentBg: "#111827",
        chatItemHover: "#1e293b",
        chatItemSelected: "#1e293b",
        chatMessageFromMeBg: "#2a4165",
        chatMessageFromMeHover: "#2d497a",
        chatMessageFromOtherBg: "#1e293b",
        chatInputBg: "#0f172a",
        chatWelcomeBg: "#1a2234",
        loginGradientFrom: "#1a2333",
        loginGradientVia: "#1e2a3b",
        loginGradientTo: "#182635",
        navButtonActive: "#38d9a9",
        navButtonIndicator: "#2AB09C",
        navButtonHover: "#38d9a9CC",
        logButtonIcon: "#38d9a9",
        navText: "#38d9a9",
        navTextStrong: "#38d9a9",
        navIndicator: "#2AB09C",
        navTextHover: "#38d9a9CC",
        navTextMuted: "#9ed8ec",
        actionButton: "#2AB09C",
        actionButtonHover: "#38d9a9",
        actionButtonText: "#ffffff",
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
