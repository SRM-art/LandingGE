/// <reference types="astro/client" />
declare namespace App { interface Locals { isAdmin: boolean; user: import('./server/auth').Identity | null; } }

