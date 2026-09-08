export type DeviceKind = 'mobile' | 'tablet' | 'desktop';

/** UA 解析出的浏览器规范名。Others 表示未能识别。 */
export type BrowserName =
  | 'Chrome'
  | 'Edge'
  | 'Firefox'
  | 'Safari'
  | 'Opera'
  | 'Quark'
  | 'WeChat'
  | 'QQBrowser'
  | '360'
  | 'IE'
  | 'Others';

const BROWSER_RULES: ReadonlyArray<readonly [BrowserName, RegExp]> = [
  // 探测顺序即优先级：Edge/Opera/夸克等新式 UA 都同时伪装成 Chrome/Safari
  ['Edge', /Edg(?:A|iOS)?\//i],
  ['Opera', /OPiOS|OPR\/|Opera/i],
  ['Quark', /Quark\//i],
  ['WeChat', /MicroMessenger/i],
  ['QQBrowser', /QQBrowser\//i],
  ['360', /360(EE|SE|Chrome)|Qihoo/i],
  ['Firefox', /Firefox|FxiOS/i],
  ['IE', /MSIE |Trident/i],
  ['Chrome', /CriOS|\bChrome\//i],
  ['Safari', /\bSafari\//i],
];

/**
 * 以「是否手机/平板硬件特征」为准而不是浏览器内核：
 * 国内大量“Chrome 壳”App 的 UA 尾部会拼 Mission Style / 机型信息。
 */
export function parseDeviceKind(ua: string): DeviceKind {
  if (/iPad|Tablet|PlayBook|KFAP|KF[A-Z]A|Silk/i.test(ua)) return 'tablet';
  if (/Android.+Mobile|iPhone|iPod|Windows Phone|BlackBerry|IEMobile/i.test(ua))
    return 'mobile';
  // 新版 iPadOS 的 Safari 默认请求桌面站点，UA 里只剩 Macintosh + 触摸点
  if (/Macintosh.*Version\/.*Safari/i.test(ua) && !/iPad/.test(ua))
    return 'desktop';
  if (/Mobile|iPod|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function parseBrowserName(ua: string): BrowserName {
  for (const [name, pattern] of BROWSER_RULES) {
    if (pattern.test(ua)) return name;
  }
  return 'Others';
}

const BROWSER_ALIASES: Readonly<Partial<Record<BrowserName, string>>> = {
  Chrome: '谷歌浏览器',
  Edge: '微软浏览器',
  Firefox: '火狐浏览器',
  Safari: '苹果浏览器',
  Opera: '欧朋浏览器',
  Quark: '夸克浏览器',
  WeChat: '微信内置',
  QQBrowser: 'QQ 浏览器',
  '360': '360 浏览器',
  IE: 'IE 浏览器',
  Others: '其他浏览器',
};

export function browserAlias(name: BrowserName): string {
  return BROWSER_ALIASES[name] ?? name;
}
