import process from 'node:process';

const API_URL = process.env.QN_API_URL!;
const API_KEY = process.env.QN_DISTRIBUTOR_KEY!;

export type CanClaimResp = {
	success: boolean;
	message?: string | null;
	data?: { canClaim: boolean; amount?: number; amountInWei?: string; isTapClosed?: boolean };
};

export async function canClaim(address: string, visitorId: string): Promise<CanClaimResp> {
	const res = await fetch(`${API_URL}/partners/distributors/can-claim`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-partner-api-key': API_KEY,
		},
		body: JSON.stringify({ address, visitorId }),
	});
	return (await res.json()) as CanClaimResp;
}

export type ClaimCreateResp = {
	success?: boolean;
	message?: string;
	transactionId?: string;
};

export async function submitClaim(address: string, visitorId: string): Promise<ClaimCreateResp> {
	const res = await fetch(`${API_URL}/partners/distributors/claim`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-partner-api-key': API_KEY,
		},
		body: JSON.stringify({ address, visitorId }),
	});
	return (await res.json()) as ClaimCreateResp;
}

export type ClaimStatusResp = {
	success: boolean;
	message?: string | null;
	data?: {
		transactionId?: string;
		status?: string;
		amount?: string; // wei as string
		toAddress?: string;
		error?: string | null;
		transactionHash?: string | null; // null while processing
	};
};

export async function getClaimStatus(transactionId: string): Promise<ClaimStatusResp> {
	const res = await fetch(`${API_URL}/partners/distributors/claim?transactionId=${encodeURIComponent(transactionId)}`, {
		headers: { 'x-partner-api-key': API_KEY },
	});
	return (await res.json()) as ClaimStatusResp;
}
