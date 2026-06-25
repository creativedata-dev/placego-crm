import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="w-full max-w-md space-y-6 p-8 bg-background rounded-xl border shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">PlaceGo CRM</h1>
          <p className="text-muted-foreground text-sm">
            Entre com suas credenciais para continuar
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
