using PersonalRSSReader.Api.Models;

namespace PersonalRSSReader.Api.Models.DTOs;

/// <summary>
/// Response returned after refreshing all feeds, including aggregate counts
/// so the frontend can display a summary with a single request.
/// </summary>
public class RefreshAllFeedsResult
{
    public int NewArticlesCount { get; set; }
    public List<Article> Articles { get; set; } = new();
    public int FailedFeedsCount { get; set; }
}
