package clients

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/i0dk1/NeoWallet/processor-service/internal/models"
)

type AccountsClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewAccountsClient(baseURL, apiKey string) *AccountsClient {
	return &AccountsClient{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        20,
				IdleConnTimeout:     30 * time.Second,
				DisableCompression:  false,
			},
		},
	}
}

func (c *AccountsClient) GetUser(ctx context.Context, userID int) (*models.GetAccountResponse, error) {
	url := fmt.Sprintf("%s/accounts/%d", c.baseURL, userID)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creando petición: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error llamando a accounts-service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("accounts-service devolvió %d: %s", resp.StatusCode, string(body))
	}

	var user models.GetAccountResponse
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("error decodificando respuesta: %w", err)
	}

	return &user, nil
}

func (c *AccountsClient) UpdateBalance(ctx context.Context, req models.UpdateBalanceRequest) (*models.UpdateBalanceResponse, error) {
	url := fmt.Sprintf("%s/accounts/update-balance", c.baseURL)

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("error serializando petición: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("error creando petición: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Internal-Key", c.apiKey)

	resp, err := c.doWithRetry(ctx, httpReq, body, 3)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusBadRequest {
		var errResp struct {
			Error string `json:"error"`
		}
		json.NewDecoder(resp.Body).Decode(&errResp)
		if errResp.Error == "insufficient_funds" {
			return nil, fmt.Errorf("insufficient_funds")
		}
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("error de validación: %s", string(bodyBytes))
	}

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("accounts-service devolvió %d: %s", resp.StatusCode, string(respBody))
	}

	var result models.UpdateBalanceResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decodificando respuesta: %w", err)
	}

	return &result, nil
}

func (c *AccountsClient) doWithRetry(ctx context.Context, req *http.Request, body []byte, maxRetries int) (*http.Response, error) {
	var lastErr error

	for i := 0; i < maxRetries; i++ {
		if i > 0 {
			slog.Warn("reintentando petición a accounts-service", "intento", i+1, "url", req.URL.Path)
			time.Sleep(time.Duration(i*100) * time.Millisecond)

			// recrear el body para cada reintento
			req.Body = io.NopCloser(bytes.NewReader(body))
			req.ContentLength = int64(len(body))
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode >= 500 {
			resp.Body.Close()
			lastErr = fmt.Errorf("error de servidor: %d", resp.StatusCode)
			continue
		}

		return resp, nil
	}

	return nil, fmt.Errorf("agotados %d reintentos: %w", maxRetries, lastErr)
}