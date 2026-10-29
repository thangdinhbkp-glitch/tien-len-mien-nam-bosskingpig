using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;
using System.Threading;

class RoomData
{
    public long Version = 1;
    public string StateJson = "{}";
    public List<string> Events = new List<string>();
    public readonly object LockObj = new object();
}

class TienLenServer
{
    private static readonly ConcurrentDictionary<string, RoomData> Rooms = new ConcurrentDictionary<string, RoomData>();
    private static string RootDir;
    private static int Port = 8080;

    static void Main(string[] args)
    {
        RootDir = AppDomain.CurrentDomain.BaseDirectory;
        if (args.Length > 0) int.TryParse(args[0], out Port);

        string localIp = GetLocalWifiIp();
        TcpListener listener = new TcpListener(IPAddress.Any, Port);
        listener.Start();

        Console.OutputEncoding = Encoding.UTF8;
        Console.WriteLine("====================================================");
        Console.WriteLine("  SERVER TIEN LEN MIEN NAM WIFI DA KHOI DONG!");
        Console.WriteLine("  Link cho ban (Host): http://localhost:" + Port);
        Console.WriteLine("  Link gui ban be cung WiFi: http://" + localIp + ":" + Port);
        Console.WriteLine("====================================================");

        while (true)
        {
            try
            {
                TcpClient client = listener.AcceptTcpClient();
                ThreadPool.QueueUserWorkItem(HandleClient, client);
            }
            catch (Exception) { }
        }
    }

    static string GetLocalWifiIp()
    {
        try
        {
            using (Socket socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0))
            {
                socket.Connect("8.8.8.8", 65530);
                IPEndPoint endPoint = socket.LocalEndPoint as IPEndPoint;
                if (endPoint != null && endPoint.Address != null)
                {
                    return endPoint.Address.ToString();
                }
            }
        }
        catch { }

        try
        {
            foreach (NetworkInterface ni in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (ni.OperationalStatus != OperationalStatus.Up) continue;
                if (ni.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                string name = ni.Name.ToLowerInvariant() + " " + ni.Description.ToLowerInvariant();
                if (name.Contains("wsl") || name.Contains("vethernet") || name.Contains("virtual") || name.Contains("vmware") || name.Contains("bluetooth"))
                    continue;

                foreach (UnicastIPAddressInformation ip in ni.GetIPProperties().UnicastAddresses)
                {
                    if (ip.Address.AddressFamily == AddressFamily.InterNetwork)
                    {
                        return ip.Address.ToString();
                    }
                }
            }
        }
        catch { }

        return "127.0.0.1";
    }

    static void HandleClient(object obj)
    {
        using (TcpClient client = (TcpClient)obj)
        {
            try
            {
                client.ReceiveTimeout = 5000;
                client.SendTimeout = 5000;
                using (NetworkStream stream = client.GetStream())
                {
                    // Read HTTP header
                    List<byte> headerBytes = new List<byte>();
                    int b;
                    while ((b = stream.ReadByte()) != -1)
                    {
                        headerBytes.Add((byte)b);
                        int count = headerBytes.Count;
                        if (count >= 4 &&
                            headerBytes[count - 4] == '\r' &&
                            headerBytes[count - 3] == '\n' &&
                            headerBytes[count - 2] == '\r' &&
                            headerBytes[count - 1] == '\n')
                        {
                            break;
                        }
                        if (count > 16384) break;
                    }

                    if (headerBytes.Count == 0) return;
                    string headerStr = Encoding.UTF8.GetString(headerBytes.ToArray());
                    string[] lines = headerStr.Split(new string[] { "\r\n" }, StringSplitOptions.None);
                    if (lines.Length == 0) return;

                    string[] reqParts = lines[0].Split(' ');
                    if (reqParts.Length < 2) return;
                    string method = reqParts[0].ToUpperInvariant();
                    string rawUrl = reqParts[1];

                    int contentLength = 0;
                    foreach (string line in lines)
                    {
                        if (line.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase))
                        {
                            int.TryParse(line.Substring(15).Trim(), out contentLength);
                        }
                    }

                    string body = "";
                    if (contentLength > 0 && contentLength < 2 * 1024 * 1024)
                    {
                        byte[] bodyBytes = new byte[contentLength];
                        int readTotal = 0;
                        while (readTotal < contentLength)
                        {
                            int r = stream.Read(bodyBytes, readTotal, contentLength - readTotal);
                            if (r <= 0) break;
                            readTotal += r;
                        }
                        body = Encoding.UTF8.GetString(bodyBytes, 0, readTotal);
                    }

                    if (method == "OPTIONS")
                    {
                        SendResponse(stream, "200 OK", "text/plain", new byte[0]);
                        return;
                    }

                    string path = rawUrl;
                    string query = "";
                    int qIdx = rawUrl.IndexOf('?');
                    if (qIdx >= 0)
                    {
                        path = rawUrl.Substring(0, qIdx);
                        query = rawUrl.Substring(qIdx + 1);
                    }

                    if (path == "/api/info")
                    {
                        string ip = GetLocalWifiIp();
                        string pubUrl = "";
                        try
                        {
                            string logFile = Path.Combine(RootDir, "tunnel.log");
                            if (File.Exists(logFile))
                            {
                                using (FileStream fs = new FileStream(logFile, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                                using (StreamReader sr = new StreamReader(fs, Encoding.UTF8))
                                {
                                    string logContent = sr.ReadToEnd();
                                    System.Text.RegularExpressions.MatchCollection matches =
                                        System.Text.RegularExpressions.Regex.Matches(logContent, @"https://[a-zA-Z0-9-]+\.lhr\.life");
                                    if (matches.Count > 0)
                                    {
                                        pubUrl = matches[matches.Count - 1].Value;
                                    }
                                }
                            }
                            if (string.IsNullOrEmpty(pubUrl))
                            {
                                string pubFile = Path.Combine(RootDir, "public_url.txt");
                                if (File.Exists(pubFile))
                                {
                                    pubUrl = File.ReadAllText(pubFile).Trim();
                                }
                            }
                        }
                        catch { }
                        string json = "{\"ip\":\"" + ip + "\",\"port\":" + Port + ",\"publicUrl\":\"" + pubUrl + "\"}";
                        SendJson(stream, json);
                        return;
                    }

                    if (path.StartsWith("/api/room/"))
                    {
                        string[] segs = path.Split(new char[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
                        if (segs.Length >= 4)
                        {
                            string roomId = segs[2].ToUpperInvariant();
                            string action = segs[3].ToLowerInvariant();
                            RoomData room = Rooms.GetOrAdd(roomId, _ => new RoomData());

                            if (method == "POST" && action == "state")
                            {
                                lock (room.LockObj)
                                {
                                    room.StateJson = body;
                                    room.Version++;
                                    SendJson(stream, "{\"ok\":true,\"version\":" + room.Version + "}");
                                }
                                return;
                            }
                            else if (method == "POST" && action == "event")
                            {
                                lock (room.LockObj)
                                {
                                    room.Events.Add(body);
                                    room.Version++;
                                    SendJson(stream, "{\"ok\":true}");
                                }
                                return;
                            }
                            else if (method == "GET" && action == "poll")
                            {
                                bool isHost = query.Contains("host=1");
                                lock (room.LockObj)
                                {
                                    StringBuilder sb = new StringBuilder();
                                    sb.Append("{\"version\":").Append(room.Version);
                                    sb.Append(",\"state\":").Append(string.IsNullOrEmpty(room.StateJson) ? "{}" : room.StateJson);
                                    sb.Append(",\"events\":[");
                                    if (isHost && room.Events.Count > 0)
                                    {
                                        for (int i = 0; i < room.Events.Count; i++)
                                        {
                                            if (i > 0) sb.Append(",");
                                            sb.Append(room.Events[i]);
                                        }
                                        room.Events.Clear();
                                    }
                                    sb.Append("]}");
                                    SendJson(stream, sb.ToString());
                                }
                                return;
                            }
                        }
                    }

                    // Static files
                    string relPath = path == "/" ? "index.html" : path.TrimStart('/');
                    relPath = relPath.Replace('/', Path.DirectorySeparatorChar);
                    if (relPath.Contains(".."))
                    {
                        SendResponse(stream, "403 Forbidden", "text/plain", Encoding.UTF8.GetBytes("Forbidden"));
                        return;
                    }

                    string filePath = Path.Combine(RootDir, relPath);
                    if (!File.Exists(filePath))
                    {
                        SendResponse(stream, "404 Not Found", "text/plain", Encoding.UTF8.GetBytes("Not Found"));
                        return;
                    }

                    string ext = Path.GetExtension(filePath).ToLowerInvariant();
                    string contentType = "application/octet-stream";
                    if (ext == ".html") contentType = "text/html; charset=utf-8";
                    else if (ext == ".css") contentType = "text/css; charset=utf-8";
                    else if (ext == ".js") contentType = "application/javascript; charset=utf-8";
                    else if (ext == ".json") contentType = "application/json; charset=utf-8";
                    else if (ext == ".jpg" || ext == ".jpeg") contentType = "image/jpeg";
                    else if (ext == ".png") contentType = "image/png";
                    else if (ext == ".gif") contentType = "image/gif";
                    else if (ext == ".mp4") contentType = "video/mp4";
                    else if (ext == ".ogg") contentType = "audio/ogg";
                    else if (ext == ".mp3") contentType = "audio/mpeg";
                    else if (ext == ".svg") contentType = "image/svg+xml";
                    else if (ext == ".webp") contentType = "image/webp";

                    byte[] fileBytes = File.ReadAllBytes(filePath);
                    SendResponse(stream, "200 OK", contentType, fileBytes);
                }
            }
            catch (Exception) { }
        }
    }

    static void SendJson(NetworkStream stream, string json)
    {
        SendResponse(stream, "200 OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes(json));
    }

    static void SendResponse(NetworkStream stream, string status, string contentType, byte[] content)
    {
        string header =
            "HTTP/1.1 " + status + "\r\n" +
            "Content-Type: " + contentType + "\r\n" +
            "Content-Length: " + content.Length + "\r\n" +
            "Access-Control-Allow-Origin: *\r\n" +
            "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
            "Access-Control-Allow-Headers: Content-Type\r\n" +
            "Cache-Control: no-store, no-cache, must-revalidate\r\n" +
            "Connection: close\r\n\r\n";
        byte[] headerBytes = Encoding.UTF8.GetBytes(header);
        stream.Write(headerBytes, 0, headerBytes.Length);
        if (content.Length > 0)
        {
            stream.Write(content, 0, content.Length);
        }
        stream.Flush();
    }
}
