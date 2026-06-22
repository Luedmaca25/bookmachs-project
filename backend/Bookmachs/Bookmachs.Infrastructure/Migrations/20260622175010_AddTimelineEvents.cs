using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bookmachs.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTimelineEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPublic",
                table: "MatchTransactions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "TimelineEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MatchTransactionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimelineEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimelineEvents_MatchTransactions_MatchTransactionId",
                        column: x => x.MatchTransactionId,
                        principalTable: "MatchTransactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimelineEvents_MatchTransactionId",
                table: "TimelineEvents",
                column: "MatchTransactionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TimelineEvents");

            migrationBuilder.DropColumn(
                name: "IsPublic",
                table: "MatchTransactions");
        }
    }
}
