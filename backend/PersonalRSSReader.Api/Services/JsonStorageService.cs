using System.Text.Json;

namespace PersonalRSSReader.Api.Services;

public class JsonStorageService
{
    private readonly string _dataDirectory;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly ILogger<JsonStorageService> _logger;
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true
    };

    public JsonStorageService(IConfiguration configuration, IWebHostEnvironment env, ILogger<JsonStorageService> logger)
    {
        var relativeDir = configuration["Storage:DataDirectory"] ?? "Data";
        _dataDirectory = Path.Combine(env.ContentRootPath, relativeDir);
        _logger = logger;
    }

    public async Task<List<T>> ReadAllAsync<T>(string fileName)
    {
        await _lock.WaitAsync();
        try
        {
            var filePath = Path.Combine(_dataDirectory, fileName);

            if (!File.Exists(filePath))
            {
                return new List<T>();
            }

            var json = await File.ReadAllTextAsync(filePath);
            if (string.IsNullOrWhiteSpace(json))
            {
                return new List<T>();
            }

            var items = JsonSerializer.Deserialize<List<T>>(json, _jsonOptions) ?? new List<T>();
            _logger.LogDebug("Read {Count} items from {FilePath}", items.Count, filePath);
            return items;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task WriteAllAsync<T>(string fileName, List<T> items)
    {
        await _lock.WaitAsync();
        try
        {
            if (!Directory.Exists(_dataDirectory))
            {
                Directory.CreateDirectory(_dataDirectory);
            }

            var filePath = Path.Combine(_dataDirectory, fileName);
            var json = JsonSerializer.Serialize(items, _jsonOptions);
            await File.WriteAllTextAsync(filePath, json);
            _logger.LogDebug("Wrote {Count} items to {FilePath}", items.Count, filePath);
        }
        finally
        {
            _lock.Release();
        }
    }
}