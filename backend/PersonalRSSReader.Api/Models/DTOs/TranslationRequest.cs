namespace PersonalRSSReader.Api.Models.DTOs;

public class TranslationRequest
{
    public string Text { get; set; } = string.Empty;
    public string? Source { get; set; }
    public string Target { get; set; } = "ar";
}

public class BatchTranslationRequest
{
    public Dictionary<string, string> Texts { get; set; } = new();
    public string? Source { get; set; }
    public string Target { get; set; } = "ar";
}
