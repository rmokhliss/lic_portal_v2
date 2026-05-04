// ==============================================================================
// LIC v2 — Entité Notification (Phase 8.B)
// Pas d'audit (volume élevé, événement système). PK uuidv7.
// ==============================================================================

export type NotifPriority = "INFO" | "WARNING" | "CRITICAL";

export interface CreateNotificationInput {
  readonly userId: string;
  readonly title: string;
  readonly body: string;
  readonly href?: string;
  readonly priority?: NotifPriority;
  readonly source: string;
  readonly metadata?: Record<string, unknown>;
}

export interface RehydrateNotificationProps {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly body: string;
  readonly href: string | null;
  readonly priority: NotifPriority;
  readonly source: string;
  readonly metadata: Record<string, unknown> | null;
  readonly read: boolean;
  readonly readAt: Date | null;
  readonly createdAt: Date;
}

interface Props {
  readonly userId: string;
  readonly title: string;
  readonly body: string;
  readonly href: string | null;
  readonly priority: NotifPriority;
  readonly source: string;
  readonly metadata: Record<string, unknown> | null;
  readonly read: boolean;
  readonly readAt: Date | null;
}

export class Notification {
  readonly userId: string;
  readonly title: string;
  readonly body: string;
  readonly href: string | null;
  readonly priority: NotifPriority;
  readonly source: string;
  readonly metadata: Record<string, unknown> | null;
  readonly read: boolean;
  readonly readAt: Date | null;

  protected constructor(props: Props) {
    this.userId = props.userId;
    this.title = props.title;
    this.body = props.body;
    this.href = props.href;
    this.priority = props.priority;
    this.source = props.source;
    this.metadata = props.metadata;
    this.read = props.read;
    this.readAt = props.readAt;
  }

  static create(input: CreateNotificationInput): Notification {
    return new Notification({
      userId: input.userId,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      priority: input.priority ?? "INFO",
      source: input.source,
      metadata: input.metadata ?? null,
      read: false,
      readAt: null,
    });
  }

  static rehydrate(props: RehydrateNotificationProps): PersistedNotification {
    return new PersistedNotification(
      {
        userId: props.userId,
        title: props.title,
        body: props.body,
        href: props.href,
        priority: props.priority,
        source: props.source,
        metadata: props.metadata,
        read: props.read,
        readAt: props.readAt,
      },
      props.id,
      props.createdAt,
    );
  }
}

export class PersistedNotification extends Notification {
  readonly id: string;
  readonly createdAt: Date;

  constructor(props: Props, id: string, createdAt: Date) {
    super(props);
    this.id = id;
    this.createdAt = createdAt;
  }

  markRead(now: Date = new Date()): PersistedNotification {
    return new PersistedNotification(
      {
        userId: this.userId,
        title: this.title,
        body: this.body,
        href: this.href,
        priority: this.priority,
        source: this.source,
        metadata: this.metadata,
        read: true,
        readAt: now,
      },
      this.id,
      this.createdAt,
    );
  }
}
