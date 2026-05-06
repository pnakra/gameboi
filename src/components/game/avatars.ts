// Avatar pool for AI-invented side characters in group chats.
// We hash the lowercase name to a stable slot in the gendered pool so
// the same character keeps the same face across an entire session.

import guy1 from "@/assets/avatar-guy-1.jpg";
import guy2 from "@/assets/avatar-guy-2.jpg";
import guy3 from "@/assets/avatar-guy-3.jpg";
import girl1 from "@/assets/avatar-girl-1.jpg";
import girl2 from "@/assets/avatar-girl-2.jpg";
import girl3 from "@/assets/avatar-girl-3.jpg";

const GUYS = [guy1, guy2, guy3];
const GIRLS = [girl1, girl2, girl3];

export type Gender = "m" | "f";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Pick a stable avatar for an invented character based on name + gender. */
export function avatarFor(name: string, gender: Gender): string {
  const pool = gender === "f" ? GIRLS : GUYS;
  return pool[hash(name.toLowerCase()) % pool.length];
}
