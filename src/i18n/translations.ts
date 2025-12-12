import zh from './locales/zh';
import zhTW from './locales/zhTW';
import yue from './locales/yue';
import en from './locales/en';
import ru from './locales/ru';
import uk from './locales/uk';

export type Lang = 'zh' | 'zh-TW' | 'yue' | 'en' | 'ru' | 'uk';

export const TRANSLATIONS_BASE = {
    zh,
    en,
    ru,
} as const;

export const TRANSLATIONS = {
    zh,
    'zh-TW': zhTW,
    yue,
    en,
    ru,
    uk,
} as const;
