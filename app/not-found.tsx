import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h2 className="text-2xl font-bold">Page not found</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <Button className="mt-6" size="sm" asChild>
        <Link href="/">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
