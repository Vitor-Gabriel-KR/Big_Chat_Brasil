import { ApiError, Client, detectDocumentType, normalizeDocumentId } from '../domain';
import { findClientByDocumentId } from '../repositories/clientRepository';

export const loginWithDocument = async (rawDocumentId: string, documentType: 'CPF' | 'CNPJ') => {
  const documentId = normalizeDocumentId(rawDocumentId);
  const detectedType = detectDocumentType(documentId);

  if (!documentId) {
    throw new ApiError('Informe um CPF ou CNPJ válido.', 400);
  }

  if (documentType === 'CPF' && documentId.length !== 11) {
    throw new ApiError('CPF deve conter 11 dígitos.', 400);
  }

  if (documentType === 'CNPJ' && documentId.length !== 14) {
    throw new ApiError('CNPJ deve conter 14 dígitos.', 400);
  }

  if (!detectedType) {
    throw new ApiError('Documento inválido.', 400);
  }

  const client = await findClientByDocumentId(documentId);

  if (!client || !client.active) {
    throw new ApiError('Cliente não encontrado ou inativo.', 404);
  }

  return client;
};

export const serializeSession = (client: Client) => ({
  client,
  session: {
    documentId: client.documentId,
    documentType: client.documentId.length === 11 ? 'CPF' : 'CNPJ',
  },
});

