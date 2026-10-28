/**
 * VoiceCall — WebRTC placeholder for AI Voice communication
 *
 * Consumes: authSlice (role for instructor vs technician views)
 * Produces: WebRTC call UI placeholder (Phase 2)
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA
 */

import { useSelector } from 'react-redux';
import { selectUserRole } from '../auth/slice';

interface VoiceCallProps {
  ticketId: string;
}

const VoiceCall: React.FC<VoiceCallProps> = ({ ticketId }) => {
  const role = useSelector(selectUserRole);

  // Render different UI based on user role
  if (role === 'instructor') {
    return (
      <section
        className="voice-call voice-call--instructor"
        aria-labelledby="voice-call-instructor-title"
        aria-describedby="voice-call-instructor-desc"
      >
        <h2 id="voice-call-instructor-title">Voice Call — Instructor Mode</h2>
        <p id="voice-call-instructor-desc">
          Instructor voice call for ticket {ticketId}. WebRTC connection pending — Phase 2.
        </p>
        <div className="voice-call-status" role="status" aria-live="polite">
          Waiting for peer connection...
        </div>
      </section>
    );
  }

  if (role === 'technician') {
    return (
      <section
        className="voice-call voice-call--technician"
        aria-labelledby="voice-call-technician-title"
        aria-describedby="voice-call-technician-desc"
      >
        <h2 id="voice-call-technician-title">Voice Call — Technician Mode</h2>
        <p id="voice-call-technician-desc">
          Technician voice call for ticket {ticketId}. WebRTC connection pending — Phase 2.
        </p>
        <div className="voice-call-status" role="status" aria-live="polite">
          Waiting for peer connection...
        </div>
      </section>
    );
  }

  // Default unauthenticated view
  return (
    <section
      className="voice-call"
      aria-labelledby="voice-call-default-title"
      aria-describedby="voice-call-default-desc"
    >
      <h2 id="voice-call-default-title">Voice Call</h2>
      <p id="voice-call-default-desc">
        Voice communication for ticket {ticketId}. WebRTC placeholder — Phase 2.
        Please log in to enable voice calls.
      </p>
      <div className="voice-call-status" role="status" aria-live="polite">
        Login required for voice call features.
      </div>
    </section>
  );
};

export default VoiceCall;
