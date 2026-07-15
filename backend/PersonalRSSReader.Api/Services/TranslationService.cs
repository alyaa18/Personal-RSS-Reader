using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace PersonalRSSReader.Api.Services;

public class TranslationService
{
    private readonly HttpClient _httpClient;
    private const string LibreTranslateUrl = "https://libretranslate.com/translate";

    public TranslationService(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _httpClient.Timeout = TimeSpan.FromSeconds(10);
    }

    public async Task<string?> TranslateAsync(string text, string sourceLang, string targetLang)
    {
        if (string.IsNullOrWhiteSpace(text)) return text;
        if (sourceLang == targetLang) return text;

        try
        {
            var request = new LibreTranslateRequest
            {
                Q = text,
                Source = sourceLang,
                Target = targetLang,
                Format = "text",
            };

            var response = await _httpClient.PostAsJsonAsync(LibreTranslateUrl, request);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<LibreTranslateResponse>();
            return result?.TranslatedText;
        }
        catch
        {
            return null;
        }
    }

    public async Task<Dictionary<string, string?>> TranslateBatchAsync(
        Dictionary<string, string> texts, string sourceLang, string targetLang)
    {
        var results = new Dictionary<string, string?>();
        foreach (var kvp in texts)
        {
            results[kvp.Key] = await TranslateAsync(kvp.Value, sourceLang, targetLang);
        }
        return results;
    }

    private class LibreTranslateRequest
    {
        [JsonPropertyName("q")]
        public string Q { get; set; } = string.Empty;

        [JsonPropertyName("source")]
        public string Source { get; set; } = "auto";

        [JsonPropertyName("target")]
        public string Target { get; set; } = string.Empty;

        [JsonPropertyName("format")]
        public string Format { get; set; } = "text";
    }

    private class LibreTranslateResponse
    {
        [JsonPropertyName("translatedText")]
        public string TranslatedText { get; set; } = string.Empty;
    }
}
