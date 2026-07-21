// src/ui/core/eventBindings.ts
// ------------------------------------------------------------
// EVENT BINDING CONTRACT
//
// Responsibility:
// - defines EventBinding: ONE [target, event type, listener] tuple —
//   the unit of the controller's declarative add/remove table
//   (use sites express plurality themselves: EventBinding[])
// - provides asListener: the single place where specifically-typed
//   handlers (MouseEvent/PointerEvent) are bridged to the generic
//   EventListener contract of addEventListener
//
// IMPORTANT:
// - feature handler modules produce EventBinding[]; the floating
//   controller consumes them for registration AND teardown
// - NO DOM access, NO state, NO business logic — types + one helper
// ------------------------------------------------------------

export type EventBinding = [EventTarget, string, EventListener];

/*
  Handlers are typed to their specific event (MouseEvent/PointerEvent), but
  the DOM addEventListener contract is the generic EventListener. asListener
  bridges that mismatch in ONE place. Safe: each handler is only ever
  registered on an event type that actually delivers the event it expects.
*/
export const asListener = (handler: (event: never) => unknown): EventListener =>
  handler as EventListener;
