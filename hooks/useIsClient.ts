// hooks/useIsClient.ts
import { useEffect, useState } from 'react';

/**
 * 判断是否进入客户端环境
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // 只在客户端 useEffect 执行
  }, []);

  return isClient;
}
