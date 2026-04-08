export const THEME_PRESET_STORAGE_KEY = 'english_app_theme_preset';

export const themePresets = {
    Default: {
        name: 'Default',
        description: 'Keep the current original app colors',
        colors: {
            primary: '#4F46E5',
            primaryHover: '#4338CA',
            primarySoft: '#E0E7FF',
            accent: '#6366F1',
            accentSoft: '#E0E7FF',
            success: '#10B981',
            successSoft: '#D1FAE5',
            reward: '#F59E0B',
            rewardSoft: '#FEF3C7',
            danger: '#F43F5E',
            dangerSoft: '#FFE4E6',
        },
    },
    'Indigo Ocean': {
        name: 'Indigo Ocean',
        description: 'Clean, modern, and balanced for focused learning',
        colors: {
            primary: '#4F46E5',
            primaryHover: '#4338CA',
            primarySoft: '#E0E7FF',
            accent: '#06B6D4',
            accentSoft: '#CFFAFE',
            success: '#10B981',
            successSoft: '#D1FAE5',
            reward: '#F59E0B',
            rewardSoft: '#FEF3C7',
            danger: '#F43F5E',
            dangerSoft: '#FFE4E6',
        },
    },
    'Purple Neon': {
        name: 'Purple Neon',
        description: 'Vibrant, playful, and more game-like',
        colors: {
            primary: '#7C3AED',
            primaryHover: '#6D28D9',
            primarySoft: '#EDE9FE',
            accent: '#EC4899',
            accentSoft: '#FCE7F3',
            success: '#22C55E',
            successSoft: '#DCFCE7',
            reward: '#F59E0B',
            rewardSoft: '#FEF3C7',
            danger: '#EF4444',
            dangerSoft: '#FEE2E2',
        },
    },
    'Emerald Focus': {
        name: 'Emerald Focus',
        description: 'Calm, fresh, and easy on the eyes for long sessions',
        colors: {
            primary: '#059669',
            primaryHover: '#047857',
            primarySoft: '#D1FAE5',
            accent: '#0EA5E9',
            accentSoft: '#E0F2FE',
            success: '#10B981',
            successSoft: '#D1FAE5',
            reward: '#F59E0B',
            rewardSoft: '#FEF3C7',
            danger: '#F43F5E',
            dangerSoft: '#FFE4E6',
        },
    },
    'Scorpio Terra': {
        name: 'Scorpio Terra',
        description: 'Deep, grounded, mysterious, and premium with earthy power',
        colors: {
            primary: '#7C2D12',
            primaryHover: '#9A3412',
            primarySoft: '#FEE2E2',
            accent: '#7E22CE',
            accentSoft: '#F3E8FF',
            success: '#15803D',
            successSoft: '#DCFCE7',
            reward: '#D97706',
            rewardSoft: '#FEF3C7',
            danger: '#B91C1C',
            dangerSoft: '#FEE2E2',
        },
    },
};

export const DEFAULT_THEME_PRESET_NAME = 'Default';

export const themePresetNames = Object.keys(themePresets);
