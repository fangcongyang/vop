import { message } from "antd";
import { invoke } from "@tauri-apps/api/core";

const errorHandler = (error: string) => {
  if (!error) return;
  message.error(`${error}`);
};


export default function createRequest<P = void, R = void>(
  url: string,
  expandData = false,
  delayTime = 500
) {

  return function (params: P) {
    return new Promise<R>((resolve, reject) => {
      let data: P | { data: P } = { data: params };
      if (expandData) {
        data = {
          ...params,
        }
      }
      invoke<R>(url, { ...data } as Record<string, unknown>).then(res => {
        // 有些loading效果添加强制延时效果可能会更好看, 可行性待商榷
        delayTimeFn(() => {
          resolve(res);
        }, delayTime);
      }).catch(err => {
        errorHandler(err);
        reject(err);
      })
    })
  }
}

// 简单的延时函数
function delayTimeFn(callback: () => void, time: number | true | undefined) {
  if (time) {
    const timer = setTimeout(() => {
      callback();
      clearInterval(timer);
    }, time && 500);
  } else {
    callback();
  }
}
