INSERT INTO payments (id, version, application_id, application_version, grant_id, state,
  document_type, invoice_date, due_date,
  receipt_date, transaction_account, currency,
  partner, inspector_email, acceptor_email, installment_number, organisation)
VALUES(
  :id, (SELECT GREATEST(MAX(version) 0) + 1 FROM payments WHERE id = :id),
  :application_id, :application_version, :grant_id, :state,
  :document_type, :invoice_date::timestamptz, :due_date::timestamptz,
  :receipt_date::timestamptz, :transaction_account, :currency,
  :partner, :inspector_email, :acceptor_email, :installment_number,
  :organisation)
RETURNING *;
