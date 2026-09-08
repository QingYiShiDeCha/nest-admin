import { browserAlias, parseBrowserName, parseDeviceKind } from './user-agent';

const UA = {
  chromeWin:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  edgeWin:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0.2478.67',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  ipadOs13:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  wechatIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/604.1 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49',
  quarkAndroid:
    'Mozilla/5.0 (Linux; U; Android 13; zh-CN) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0 Quark/6.9 Mobile Safari/537.36',
  firefox:
    'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
};

describe('user-agent 解析', () => {
  it('Edge 的 UA 同时伪装 Chrome/Safari，必须优先识别为 Edge', () => {
    expect(parseBrowserName(UA.edgeWin)).toBe('Edge');
  });

  it('按规则顺序识别常见内核', () => {
    expect(parseBrowserName(UA.chromeWin)).toBe('Chrome');
    expect(parseBrowserName(UA.safariMac)).toBe('Safari');
    expect(parseBrowserName(UA.firefox)).toBe('Firefox');
    expect(parseBrowserName(UA.wechatIos)).toBe('WeChat');
    expect(parseBrowserName(UA.quarkAndroid)).toBe('Quark');
    expect(parseBrowserName('totally-unknown-bot/1.0')).toBe('Others');
  });

  it('移动端以硬件特征而非内核判定', () => {
    expect(parseDeviceKind(UA.chromeWin)).toBe('desktop');
    expect(parseDeviceKind(UA.edgeWin)).toBe('desktop');
    expect(parseDeviceKind(UA.chromeAndroid)).toBe('mobile');
    expect(parseDeviceKind(UA.safariIphone)).toBe('mobile');
    expect(parseDeviceKind(UA.wechatIos)).toBe('mobile');
    expect(parseDeviceKind('Mozilla/5.0 (iPad; CPU OS 17_4)')).toBe('tablet');
    expect(parseDeviceKind('')).toBe('desktop');
  });

  it('中文名映射与白名单判定', () => {
    expect(browserAlias('Chrome')).toBe('谷歌浏览器');
    expect(browserAlias('Others')).toBe('其他浏览器');
  });
});
