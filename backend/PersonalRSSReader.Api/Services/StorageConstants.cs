namespace PersonalRSSReader.Api.Services;

/// <summary>
/// Centralized file name constants used by storage-backed services.
/// Keeping them in one place avoids duplication across services.
/// </summary>
public static class StorageConstants
{
    public const string FeedsFile = "feeds.json";
    public const string ArticlesFile = "articles.json";
}
