from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

scheduler = BackgroundScheduler()

def start_scheduler(app_state: dict = None):
    """
    Starts background jobs.
    Phase 3 will add: re-score tasks every 15 min, check SLA breaches.
    """
    @scheduler.scheduled_job('interval', minutes=15, id='rescore_tasks')
    def rescore_all_tasks():
        # TODO Phase 3: import db session, query all tasks, re-score each
        print(f"[Scheduler] Re-score job ran at {datetime.now()}")

    @scheduler.scheduled_job('interval', minutes=15, id='check_sla')
    def check_sla_breaches():
        # TODO Phase 6: flag complaints breaching SLA, store alerts
        print(f"[Scheduler] SLA check ran at {datetime.now()}")

    if not scheduler.running:
        scheduler.start()
        print("[Scheduler] Started.")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
