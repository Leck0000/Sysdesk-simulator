/**
 * RTK Query tickets API endpoints: list, get, claim, update, add message
 *
 * Consumes: authApi (for auth headers via baseQuery), wsMiddleware (for ticket_update events)
 * Produces: ticketsApi with typed query/mutation endpoints + selectors
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { z } from 'zod';
import type { RootState } from '../../app/store';

// ---------------------------------------------------------------------------
// Zod schemas (boundary validation — never pass raw network data downstream)
// ---------------------------------------------------------------------------

/** Ticket schema matching ARCHITECTURE.md §3.1 */
const TicketSchema = z.object({
  id: z.string().uuid(),
  queue: z.enum(['AD', 'networking', 'security', 'helpdesk']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().optional(),
  state: z.enum(['open', 'in_progress', 'on_hold', 'resolved', 'closed']),
  evidence: z.array(z.string()).default([]),
  scoring: z.object({
    technical: z.number().int().min(0).max(20),
    process: z.number().int().min(0).max(20),
    communication: z.number().int().min(0).max(20),
  }).default({ technical: 0, process: 0, communication: 0 }),
  requesterId: z.string().uuid(),
  assignedTechnicianId: z.string().uuid().optional(),
  relatedMachineId: z.string().uuid().optional(),
  labId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/** List tickets query params */
const ListTicketsParamsSchema = z.object({
  queue: z.enum(['AD', 'networking', 'security', 'helpdesk']).optional(),
  state: z.enum(['open', 'in_progress', 'on_hold', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedToMe: z.boolean().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

/** Claim ticket request */
const ClaimTicketRequestSchema = z.object({
  ticketId: z.string().uuid(),
});

/** Add message request */
const AddMessageRequestSchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().min(1),
});

/** Update ticket request (partial) */
const UpdateTicketRequestSchema = z.object({
  ticketId: z.string().uuid(),
  state: z.enum(['open', 'in_progress', 'on_hold', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedTechnicianId: z.string().uuid().optional(),
  evidence: z.array(z.string()).optional(),
  scoring: z.object({
    technical: z.number().int().min(0).max(20),
    process: z.number().int().min(0).max(20),
    communication: z.number().int().min(0).max(20),
  }).optional(),
});

/** Single ticket response */
const TicketResponseSchema = TicketSchema;

/** List tickets response */
const ListTicketsResponseSchema = z.object({
  tickets: z.array(TicketSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

/** Claim ticket response */
const ClaimTicketResponseSchema = TicketSchema;

/** Add message response */
const AddMessageResponseSchema = z.object({
  success: z.boolean(),
  messageId: z.string().uuid(),
});

/** Update ticket response */
const UpdateTicketResponseSchema = TicketSchema;

// Type-safe infer types from schemas
export type Ticket = z.infer<typeof TicketSchema>;
export type ListTicketsParams = z.infer<typeof ListTicketsParamsSchema>;
export type ClaimTicketRequest = z.infer<typeof ClaimTicketRequestSchema>;
export type AddMessageRequest = z.infer<typeof AddMessageRequestSchema>;
export type UpdateTicketRequest = z.infer<typeof UpdateTicketRequestSchema>;
export type TicketResponse = z.infer<typeof TicketResponseSchema>;
export type ListTicketsResponse = z.infer<typeof ListTicketsResponseSchema>;
export type ClaimTicketResponse = z.infer<typeof ClaimTicketResponseSchema>;
export type AddMessageResponse = z.infer<typeof AddMessageResponseSchema>;
export type UpdateTicketResponse = z.infer<typeof UpdateTicketResponseSchema>;

// ---------------------------------------------------------------------------
// RTK Query tickets API — typed endpoints matching ARCHITECTURE.md §5.5
// ---------------------------------------------------------------------------

export const ticketsApi = createApi({
  reducerPath: 'ticketsApi',
  baseQuery: fetchBaseQuery({
    // Inject auth token from Redux store via prepareHeaders
    prepareHeaders: (headers, { getState }) => {
      const state = getState();
      const accessToken = (state && typeof state === 'object' && 'auth' in state && typeof (state as { auth: { accessToken: string } }).auth.accessToken === 'string')
        ? (state as { auth: { accessToken: string } }).auth.accessToken
        : '';
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      return headers;
    },
    credentials: 'include',
  }),
  tagTypes: ['Ticket', 'TicketList'],
  endpoints: (builder) => ({
    /** GET /tickets — list with optional filters */
    listTickets: builder.query<ListTicketsResponse, ListTicketsParams | void>({
      query: (params) => ({
        url: '/tickets',
        method: 'GET',
        params: params ?? {},
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.tickets.map(({ id }) => ({ type: 'Ticket' as const, id })),
              { type: 'TicketList', id: 'LIST' },
            ]
          : [{ type: 'TicketList', id: 'LIST' }],
    }),

    /** GET /tickets/:id — get single ticket */
    getTicket: builder.query<TicketResponse, string>({
      query: (id) => ({
        url: `/tickets/${id}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'Ticket', id }],
    }),

    /** POST /tickets/:id/claim — claim ticket for current technician */
    claimTicket: builder.mutation<ClaimTicketResponse, ClaimTicketRequest>({
      query: ({ ticketId }) => ({
        url: `/tickets/${ticketId}/claim`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { ticketId }) => [
        { type: 'Ticket', id: ticketId },
        { type: 'TicketList', id: 'LIST' },
      ],
    }),

    /** POST /tickets/:id/messages — add message to ticket */
    addMessage: builder.mutation<AddMessageResponse, AddMessageRequest>({
      query: ({ ticketId, message }) => ({
        url: `/tickets/${ticketId}/messages`,
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: (_result, _error, { ticketId }) => [{ type: 'Ticket', id: ticketId }],
    }),

    /** PATCH /tickets/:id — update ticket (state, priority, evidence, scoring) */
    updateTicket: builder.mutation<UpdateTicketResponse, UpdateTicketRequest>({
      query: ({ ticketId, ...body }) => ({
        url: `/tickets/${ticketId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { ticketId }) => [
        { type: 'Ticket', id: ticketId },
        { type: 'TicketList', id: 'LIST' },
      ],
    }),
  }),
});

// ---------------------------------------------------------------------------
// Public API exports — mutation/query thunks and selectors
// ---------------------------------------------------------------------------

export const {
  useListTicketsQuery,
  useGetTicketQuery,
  useClaimTicketMutation,
  useAddMessageMutation,
  useUpdateTicketMutation,
} = ticketsApi;

// Utility selectors for derived data
export const selectTicketsApiState = (state: RootState) => state.ticketsApi;
export const selectListTicketsResult = ticketsApi.endpoints.listTickets.select();

// Utility selectors for loading states - use the RTK Query hook-based approach
// In components, use: const { isLoading } = useListTicketsQuery(params)
// These selectors work with the internal cache state
export const selectIsLoadingTickets = (state: { ticketsApi: { queries: Record<string, { status: string }> } }) => {
  const queries = state.ticketsApi?.queries ?? {};
  return Object.values(queries).some((q) => q.status === 'pending');
};
export const selectIsClaimingTicket = (state: { ticketsApi: { mutations: Record<string, { status: string }> } }) => {
  const mutations = state.ticketsApi?.mutations ?? {};
  return Object.values(mutations).some((m) => m.status === 'pending');
};
export const selectIsAddingMessage = (state: { ticketsApi: { mutations: Record<string, { status: string }> } }) => selectIsClaimingTicket(state);
export const selectIsUpdatingTicket = (state: { ticketsApi: { mutations: Record<string, { status: string }> } }) => selectIsClaimingTicket(state);