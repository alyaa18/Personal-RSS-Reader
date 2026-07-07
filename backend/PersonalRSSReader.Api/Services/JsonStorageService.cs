using System.Text.Json;

namespace PersonalRSSReader.Api.Services;

public class JsonStorageService
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true
    };

    public JsonStorageService(IConfiguration configuration, IWebHostEnvironment env)
    {
        var relativePath = configuration["Storage:FeedsFilePath"] ?? "Data/feeds.json";
        _filePath = Path.Combine(env.ContentRootPath, relativePath);
    }

    public async Task<List<T>> ReadAllAsync<T>()
    {
        await _lock.WaitAsync();
        try
        {
            if (!File.Exists(_filePath))
            {
                return new List<T>();
            }

            var json = await File.ReadAllTextAsync(_filePath);
            if (string.IsNullOrWhiteSpace(json))
            {
                return new List<T>();
            }

            return JsonSerializer.Deserialize<List<T>>(json, _jsonOptions) ?? new List<T>();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task WriteAllAsync<T>(List<T> items)
    {
        await _lock.WaitAsync();
        try
        {
            var directory = Path.GetDirectoryName(_filePath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var json = JsonSerializer.Serialize(items, _jsonOptions);
            await File.WriteAllTextAsync(_filePath, json);
        }
        finally
        {
            _lock.Release();
        }
    }
}