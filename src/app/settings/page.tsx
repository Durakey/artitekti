export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
      <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#d6c3a6]">Settings</p>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Workspace preferences</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Manage workspace behavior, reporting defaults and navigation preferences.</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-card p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[#d6c3a6]">Account</p>
          <div className="mt-5 space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-white">Secure login</p>
              <p className="mt-2">Sign-in and authentication settings are managed through your account provider.</p>
            </div>
            <div>
              <p className="font-medium text-white">Notifications</p>
              <p className="mt-2">Keep track of payment reminders, task updates and project deadlines.</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-card p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[#d6c3a6]">Workspace</p>
          <div className="mt-5 space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-white">Workspace layout</p>
              <p className="mt-2">Sidebar navigation is always visible on desktop and becomes a drawer on mobile.</p>
            </div>
            <div>
              <p className="font-medium text-white">Reports</p>
              <p className="mt-2">Review project metrics, spending and payment status in the reports section.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
