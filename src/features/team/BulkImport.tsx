/** BulkImport — CSV upload to create assignments for a cohort.
 *
 * Consumes: team slice (cohort), teamApi (bulkImportMutation via the bulkImport thunk)
 * Produces: file picker, Import action, import result summary, error reporting.
 * Theming: CSS variables only. Accessibility: labelled controls, focus-visible rings.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectIsBulkImportLoading, type BulkImportResult } from './api';
import { bulkImport, resetBulkImport, selectCohort } from './slice';

export const BulkImport: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const cohort = useAppSelector(selectCohort);
  const isBulkImportLoading = useAppSelector(selectIsBulkImportLoading);
  const fileInput = useRef<HTMLInputElement>(null);

  // Clear any previous import result when leaving the screen.
  useEffect(() => () => void dispatch(resetBulkImport()), [dispatch]);

  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('cohortId', cohort[0]?.id ?? '');
      setImportResult(await dispatch(bulkImport(formData)).unwrap());
    } catch (err: unknown) {
      setImportResult({
        success: false,
        imported: 0,
        failed: 1,
        errors: [{ row: 0, error: typeof err === 'string' ? err : err instanceof Error ? err.message : 'Import failed' }],
      });
    } finally {
      setIsSubmitting(false);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="space-y-4" style={{ minHeight: '400px' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-fg">Bulk Assignment Import</h2>
        <p className="text-muted text-sm">CSV upload to create assignments for a cohort</p>
      </div>

      {/* File upload form */}
      <div className="rounded-md p-4" style={{ background: 'var(--card)' }}>
        <div>
          <input
            ref={fileInput}
            type="file"
            accept=".csv, .xlsx"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted file-entry"
            aria-label="Select CSV or Excel file for bulk import"
            disabled={isBulkImportLoading || isSubmitting}
          />
          <p className="text-muted text-xs mt-1">Max 5MB, UTF-8 encoded</p>
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className="rounded-md p-4" style={{ background: 'var(--card)' }} role="status">
          {importResult.success ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-accent">✓ Successfully imported</span>
                <br />
                <span>{importResult.imported} assignments</span>
              </div>
              <div>
                <span className="text-muted">× Failed</span>
                <br />
                <span>{importResult.failed} assignments</span>
              </div>
            </div>
          ) : (
            <div>
              <span className="text-muted">0 assignments imported</span>
              <br />
              <span className="text-accent">× {importResult.failed} failed</span>
              {importResult.errors.length > 0 && (
                <div className="mt-2 text-xs text-muted overflow-x-auto">
                  {importResult.errors.slice(0, 5).map((err, i) => (
                    <div key={i} className="rounded-md p-1" style={{ background: 'var(--bg)' }}>
                      <span className="font-medium">Row {err.row}</span>
                      <span className="ml-2">{err.error.substring(0, 50)}</span>
                    </div>
                  ))}
                  {importResult.errors.length > 5 && (
                    <p className="text-muted ml-2">+ {importResult.errors.length - 5} more errors</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {(isBulkImportLoading || isSubmitting) && (
        <div role="status" style={{ color: 'var(--accent)' }}>
          Processing bulk import...
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleImport}
          disabled={!file || isSubmitting}
          className="px-3 py-1 text-sm text-bg bg-accent rounded-md disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Import
        </button>
        <button
          type="button"
          onClick={() => {
            dispatch(resetBulkImport());
            setFile(null);
            setImportResult(null);
          }}
          className="px-3 py-1 text-sm text-muted bg-border rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Cancel bulk import"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => navigate('/team')}
          className="px-3 py-1 text-sm text-fg bg-card rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Return to team dashboard"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};
