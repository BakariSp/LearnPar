// hooks/useGuestAuth.ts
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser } from '../services/auth'; // 你已有的函数
import { useAuth } from '../context/AuthContext';


export async function ensureGuestToken(
  onUserLoaded?: (user: any) => void // 👈 增加这个参数
): Promise<string | null> {
  let token = localStorage.getItem("auth_token");
  if (token && token !== 'null' && token.trim() !== '') {
    console.log("📦 Found valid token in localStorage:", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    const user = await getCurrentUser();
    console.log('📥 Loaded user from existing token:', user);
    if (user && onUserLoaded) {
      onUserLoaded(user);
    }
    return token;

  } else {
    console.warn("⚠️ No valid token found, proceeding with guest registration");
  }

  let anonId = localStorage.getItem("anon_id");
  if (!anonId) {
    anonId = crypto.randomUUID();
    localStorage.setItem("anon_id", anonId);
  }
  const guestEmail = `${anonId}@guest.temporary`;
  try {
    const res = await fetch("/api/guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: anonId, // optional
        email: guestEmail
        
      })
    });

    const data = await res.json();
    console.log('🪪 Guest API 返回内容:', data);
    console.log('🪪 Guest API 返回 token:', data.token, '类型:', typeof data.token);
    token = data.token;

    if (token) {
      localStorage.setItem("auth_token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // ✅ 补上用户信息拉取
      const user = await getCurrentUser();
      if (user && onUserLoaded) {
        onUserLoaded(user);
      }
    }

    return token;
  } catch (e) {
    console.error("❌ Failed to create guest user", e);
    return null;
  }
}

export function useGuestAuth() {
  const [isReady, setReady] = useState(false);
  const { setUser } = useAuth(); // 👈 从 AuthContext 拿到 setUser

  useEffect(() => {
    async function init() {
      console.log('🧪 useGuestAuth init started');
      await ensureGuestToken(setUser); // 👈 把 setUser 传进去
      setReady(true);
    }
    init();
  }, [setUser]);

  return isReady;
}