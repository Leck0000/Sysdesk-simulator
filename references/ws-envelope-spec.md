# WebSocket Envelope Specification

## Envelope Format
All WebSocket messages use the following JSON envelope format:
```json
{
  "v": 1,                    // protocol version
  "t": "event_type",         // event type string
  "sid": "session_id",       // session UUID
  "seq": 123,                // monotonically increasing sequence number
  "ts": 1704067200000,       // server timestamp in ms
  "payload": { ... }         // event-specific payload
}
```

## Client → Server Events
| Event Type | Payload | Description |
|-----------|---------|-------------|
| `authenticate` | `{ token: string }` | Authenticate WebSocket session |
| `request_machine_state` | `{ machineId: string }` | Request machine state delta |
| `send_command` | `{ machineId: string, command: string }` | Send command to simulated machine |
| `add_ticket_message` | `{ ticketId: string, message: string }` | Add message to ticket |
| `claim_ticket` | `{ ticketId: string }` | Claim ticket ownership |

## Server → Client Events
| Event Type | Payload | Description |
|-----------|---------|-------------|
| `cmd.result` | `{ cmdId: string, exitCode: number, stdout: string, stderr: string }` | Command execution result |
| `state.delta` | `{ subsystem: string, path: string, op: "set"\|"delete", value? }` | State delta for subsystem |
| `topology.delta` | `{ nodeId: string, attr: string, value }` | Topology change notification |
| `ticket.updated` | `{ ticket: Ticket }` | Ticket state update |
| `session.init` | `{ sessionId: string, userPrincipal: string, caps: string[] }` | Session initialization |
| `heartbeat` | `{}` | Heartbeat signal (both directions) |
| `client.ack` | `{ seq: number }` | Client acknowledgment |

## Acknowledgment Semantics
- Client **must** acknowledge each `seq` number via `client.ack` event
- Server retransmits on gap detection
- Missing acknowledgment causes session degradation

## Versioning
- Current version: `v1`
- Backward compatibility: New event types can be added; deprecated types should not be removed until all sessions have upgraded

## Examples

### Client → Server: authenticate
```json
{
  "v": 1,
  "t": "authenticate",
  "sid": "sess-12345",
  "seq": 1,
  "payload": {"token": "eyJhbGciOiJub25kaX..."
}
```

### Server → Client: cmd.result
```json
{
  "v": 1,
  "t": "cmd.result",
  "sid": "sess-12345",
  "seq": 1,
  "ts": 1704067200000,
  "payload": {
    "cmdId": "cmd-001",
    "exitCode": 0,
    "stdout": "ipconfig result",
    "stderr": ""
  }
}
```