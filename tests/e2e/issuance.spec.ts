import { expect, test } from "@playwright/test";
import { mockQuoteResponse } from "../fixtures/mockQuote";
import { bootstrapConnectedWallet } from "./helpers/bootstrap";

test.beforeEach(async ({ page }) => {
	await page.route("**/quote/request", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(mockQuoteResponse)
		});
	});

	await page.goto("/");
	await bootstrapConnectedWallet(page);
});

test("asset management controls remain interactive", async ({ page }) => {
	await expect(page.getByRole("heading", { name: "Assets Management" })).toBeVisible();

	await page.getByTestId("network-mainnet").click();
	await page.getByTestId("network-testnet").click();
	await page.getByTestId("intent-type-compact").click();
	await page.getByTestId("intent-type-escrow").click();
	await page.getByTestId("intent-type-compact").click();

	await expect(page.getByTestId("allocator-116450367070547927622991121")).toBeVisible();
	await page.getByTestId("allocator-116450367070547927622991121").click();
});

test("input/output modals open and save in issuance screen", async ({ page }) => {
	await page.getByRole("button", { name: "→" }).click();
	await expect(page.getByRole("heading", { name: "Intent Issuance" })).toBeVisible();

	await page.getByTestId("open-input-modal-0").click();
	await expect(page.getByTestId("input-token-modal")).toBeVisible();
	await page.getByTestId("input-token-modal-save").click();
	await expect(page.getByTestId("input-token-modal")).toBeHidden();

	await page.getByTestId("open-output-modal-0").click();
	await expect(page.getByTestId("output-token-modal")).toBeVisible();
	await page.getByTestId("output-token-add").click();
	await page.getByTestId("output-token-modal-save").click();
	await expect(page.getByTestId("output-token-modal")).toBeHidden();

	await page.getByTestId("quote-button").click();
	await expect(page.getByTestId("quote-button")).toBeVisible();
});
