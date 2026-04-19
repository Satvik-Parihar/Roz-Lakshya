import PriorityFooter from '../components/PriorityFooter';
import PriorityHeader from '../components/PriorityHeader';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--on-background)]">
      <PriorityHeader />

      <main className="px-6 py-16">
        <div className="mx-auto w-full max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--primary)]">Privacy</p>
          <h1 className="mt-3 font-headline text-4xl font-bold tracking-tight text-[color:var(--on-surface)]">Privacy Policy</h1>
          <p className="mt-4 text-sm leading-relaxed text-[color:var(--on-surface-variant)]">
            Last updated: April 19, 2026. This policy describes how Roz-Lakshya handles account and workflow data
            when your organization uses Smart Work Prioritization features.
          </p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-[color:var(--on-surface-variant)]">
            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">1. Data collected</h2>
              <p className="mt-2">We collect account data (name, email, role), workflow content (tasks, complaints), and operational metadata needed to provide prioritization, alerts, and analytics.</p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>Account profile fields used for authentication and role-based experience.</li>
                <li>Task fields such as deadline, effort, impact, workload, and task status updates.</li>
                <li>Complaint text and derived classification values for urgency and category routing.</li>
                <li>System events such as alert creation, read status, and timestamp metadata.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">2. Usage purpose</h2>
              <p className="mt-2">Data is used to run ranking models, personalize execution order, generate dashboards, and monitor SLA risk. We do not sell customer data.</p>
              <p className="mt-2">
                Processing is limited to workflow operations and product reliability: prioritization, analytics, operational
                monitoring, and quality improvements of model reasoning and ranking consistency.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">3. Retention and access</h2>
              <p className="mt-2">Data is retained for operational continuity and audit needs. Access is controlled by authenticated session tokens and role expectations.</p>
              <p className="mt-2">
                Access decisions are enforced at the application layer and are reviewed with organizational ownership.
                Only authorized users can access protected routes and sensitive operational data.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">4. Legal basis and consent</h2>
              <p className="mt-2">
                Data is processed under legitimate business interest for workflow execution, with explicit user actions
                (login, form submission, task updates) serving as operational consent in the deployed workspace.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">5. Security safeguards</h2>
              <p className="mt-2">
                We apply layered safeguards including authenticated sessions, transport-level security where configured,
                and service-level controls intended to reduce unauthorized access and data tampering.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>Password verification and token-based session handling.</li>
                <li>Server-side validation for critical API input fields.</li>
                <li>Operational monitoring for overdue, due-soon, and SLA risk events.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">6. Third-party services</h2>
              <p className="mt-2">
                The application may rely on external infrastructure providers for database hosting, model tooling, and
                runtime operations. Each environment owner is responsible for validating vendor compliance requirements.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">7. User rights</h2>
              <p className="mt-2">
                Users may request correction or removal of account-linked personal data according to organization policy
                and applicable local regulations.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>Request profile corrections through your workspace administrator.</li>
                <li>Request account deactivation where policy permits.</li>
                <li>Request data export for audit and compliance reporting.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">8. Policy changes</h2>
              <p className="mt-2">
                We may update this policy as product features evolve. Material updates should include an updated
                revision date and revised section text on this page.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">9. Contact</h2>
              <p className="mt-2">For privacy questions, contact your workspace administrator or support owner for this deployment.</p>
            </section>
          </div>
        </div>
      </main>

      <PriorityFooter />
    </div>
  );
}
