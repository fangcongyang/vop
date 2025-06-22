import { useEffect, useState } from "react";

export function useContentBodySize(domId) {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const dom = document.getElementById(domId);
    if (dom) {
      setSize({
        width: dom.clientWidth,
        height: dom.clientHeight,
      });
    }
    const onResize = () => {
      setSize({
        width: dom.clientWidth,
        height: dom.clientHeight,
      });
    };

    dom.addEventListener("resize", onResize);

    return () => {
      dom.removeEventListener("resize", onResize);
    };
  }, []);

  return size;
}