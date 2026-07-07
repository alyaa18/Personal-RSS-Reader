using PersonalRSSReader.Api.Models;

namespace PersonalRSSReader.Api.Services;

public class FeedService
{
    private readonly JsonStorageService _storage;

    public FeedService(JsonStorageService storage)
    {
        _storage = storage;
    }

    public async Task<List<Feed>> GetAllFeedsAsync()
    {
        return await _storage.ReadAllAsync<Feed>();
    }
}