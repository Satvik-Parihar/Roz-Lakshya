import { useMemo } from 'react';
import PriorityFooter from '../components/PriorityFooter';
import PriorityHeader from '../components/PriorityHeader';
import { getAuthSnapshot } from '../utils/auth';

export default function TermsPage() {
  const auth = useMemo(() => getAuthSnapshot(), []);

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[color:var(--on-background)]">
      <PriorityHeader appMode={auth.isAuthenticated} />

      <main className="flex-1 px-6 py-16">
        <div className="mx-auto w-full max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--primary)]">Legal</p>
          <h1 className="mt-3 font-headline text-4xl font-bold tracking-tight text-[color:var(--on-surface)]">Terms of Service</h1>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-[color:var(--on-surface-variant)]">
            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">1. Acceptance</h2>
              <p className="mt-2">By using this application, you agree to these terms and any policies linked from this page.</p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">2. Account responsibility</h2>
              <p className="mt-2">You are responsible for account credentials, submitted data, and actions performed through your session.</p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">3. Acceptable use</h2>
              <p className="mt-2">Do not use the service for unauthorized access attempts, abuse, or any activity that disrupts operations for other users.</p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">4. Service scope</h2>
              <p className="mt-2">Features may evolve over time. Availability and data behavior depend on deployment configuration and infrastructure health.</p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">5. Limitation</h2>
              <p className="mt-2">Prioritization outputs are decision support signals. Final business decisions should include human review and domain context.</p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">6. Data handling</h2>
              <p className="mt-2">
                Task records, complaint inputs, and operational metadata are processed to deliver prioritization,
                dashboards, and alerting. Data handling expectations are described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">7. Security obligations</h2>
              <p className="mt-2">
                You must keep credentials secure, use strong passwords, and avoid sharing access tokens or login
                credentials with unauthorized persons.
              </p>
              <p className="mt-2">
                You are responsible for activity performed from your account until access is revoked or credentials are rotated.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">8. Prohibited conduct</h2>
              <p className="mt-2">Users may not:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Attempt unauthorized access to infrastructure, data, or user accounts.</li>
                <li>Upload harmful code, scripts, or files intended to disrupt services.</li>
                <li>Use the service in ways that violate law, policy, or organizational controls.</li>
                <li>Interfere with platform performance, fairness, or availability for other users.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">9. Availability and changes</h2>
              <p className="mt-2">
                Features may be modified, replaced, or deprecated as product requirements evolve. We may perform
                maintenance or upgrades that affect temporary availability.
              </p>
              <p className="mt-2">
                Planned changes should be communicated through release notes or deployment-level announcements when practical.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">10. Suspension and termination</h2>
              <p className="mt-2">
                Access may be suspended or terminated for policy violations, security incidents, inactivity, or
                organizational offboarding requirements.
              </p>
              <p className="mt-2">
                Upon termination, access tokens may be revoked and account permissions may be removed immediately.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">11. Warranty disclaimer</h2>
              <p className="mt-2">
                The platform is provided on an as-available basis. We do not guarantee uninterrupted operation,
                complete accuracy of ranking outputs, or suitability for all business contexts.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">12. Liability scope</h2>
              <p className="mt-2">
                To the maximum extent permitted by applicable law, service owners are not liable for indirect,
                consequential, or incidental losses arising from service use or interruptions.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">13. Governing policy updates</h2>
              <p className="mt-2">
                These terms may be updated periodically. The effective version is the one published on this page
                with the latest revision date used by your active deployment.
              </p>
            </section>

            <section>
              <h2 className="font-headline text-xl font-bold text-[color:var(--on-surface)]">14. Contact</h2>
              <p className="mt-2">
                For legal or compliance concerns, contact your platform administrator or support owner for this environment.
              </p>
            </section>
          </div>
        </div>
      </main>

      <PriorityFooter />
    </div>
  );
}
