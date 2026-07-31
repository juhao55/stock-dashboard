// 新浪部分接口（日K / 分时）支持 JSONP，可直接在浏览器跨域调用。
// 新浪返回形如 `var t=([...]);`，其中变量名写在请求路径里（var%20t=）。
// 这里把变量名替换成随机全局名，脚本加载后读取该全局变量即可拿到数据，
// 无需服务器端 CORS 头，也不需要回调参数。

export function sinaJsonp<T = unknown>(url: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const name = '__sina_cb_' + Math.random().toString(36).slice(2, 10);
    const finalUrl = url.replace(/var%20[a-zA-Z0-9_]+=/, `var%20${name}=`);

    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timer);
      delete (window as unknown as Record<string, unknown>)[name];
      script.onload = null;
      script.onerror = null;
      script.remove();
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('新浪接口请求超时'));
    }, 12000);

    script.onload = () => {
      if (settled) return;
      const data = (window as unknown as Record<string, unknown>)[name];
      if (data === undefined) {
        settled = true;
        cleanup();
        reject(new Error('新浪接口未返回数据'));
        return;
      }
      settled = true;
      cleanup();
      resolve(data as T);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('新浪接口加载失败（可能被网络或跨域策略拦截）'));
    };

    script.src = finalUrl;
    document.head.appendChild(script);
  });
}
