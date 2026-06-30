// NOTE: This file is an intentional re-export shim, not a second
// implementation. The canonical toast state machine (reducer, dispatch,
// memoryState, listeners) lives in src/hooks/use-toast.ts. This shim
// exists only so that `@/components/ui/use-toast` keeps working as an
// import path for any shadcn/ui component generated against an older
// CLI convention that expected the hook to live alongside ui/toast.tsx.
//
// Do NOT copy the reducer/state logic into this file — doing so would
// create two independent toast queues (each with its own memoryState),
// and components importing from different paths would stop seeing each
// other's toasts.
import { useToast, toast } from "@/hooks/use-toast";

export { useToast, toast };
