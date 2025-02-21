import { useEffect, useRef } from "react";

/**
 * sử dụng để xử lý sự kiện khi người dùng chuẩn bị rời khỏi trang web (unload)
 * @param {*} handler  Là một hàm callback sẽ được thực thi khi người dùng chuẩn bị rời khỏi trang
 * @param {*} callOnCleanup  Là một boolean flag để quyết định có gọi handler khi component unmount hay không
 */
const useWindowUnloadEffect = (handler, callOnCleanup) => {
  const cb = useRef();

  cb.current = handler;

  useEffect(() => {
    const handler = () => cb.current();

    window.addEventListener("beforeunload", handler);

    return () => {
      if (callOnCleanup) handler();

      window.removeEventListener("beforeunload", handler);
    };
  }, [cb]);
};

export default useWindowUnloadEffect;
